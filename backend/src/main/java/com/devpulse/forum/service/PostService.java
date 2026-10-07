package com.devpulse.forum.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CreatePostRequest;
import com.devpulse.forum.dto.PostDto;
import com.devpulse.forum.dto.PostSummaryDto;
import com.devpulse.forum.dto.UpdatePostRequest;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.entity.Tag;
import com.devpulse.forum.repository.CategoryRepository;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.forum.repository.TagRepository;
import com.devpulse.forum.util.SlugUtil;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static com.devpulse.forum.security.ForumAuthorities.isAdmin;
import static com.devpulse.forum.security.ForumAuthorities.isStaff;
import static com.devpulse.forum.security.ForumAuthorities.isUser;

/**
 * Business logic for the forum post endpoints.
 *
 * <p>Visibility:
 * <ul>
 *   <li>{@code PUBLISHED} and {@code LOCKED} posts are public. Locked posts
 *       are read-only for everyone except staff (moderators and admins).</li>
 *   <li>{@code DRAFT} posts are visible to their author and admins only.</li>
 *   <li>{@code DELETED} posts are soft-deleted, so comments and votes that
 *       point to them stay valid; they return 404.</li>
 * </ul>
 *
 * <p>Permissions: anyone authenticated may create a post; the author and
 * staff may edit or delete it ({@link com.devpulse.forum.security.PostSecurity});
 * only staff may lock, unlock or pin.
 *
 * <p>The denormalised {@code tags.post_count} and {@code users.post_count}
 * count public posts and are adjusted with atomic updates whenever a post
 * becomes public or stops being public, or its tags change.
 */
@Service
@RequiredArgsConstructor
public class PostService {

    /** How often to try creating a post when a concurrent insert takes the same slug. */
    static final int MAX_SLUG_ATTEMPTS = 3;

    /** Unique constraint on {@code posts.slug} created by migration V2. */
    static final String SLUG_CONSTRAINT = "posts_slug_key";

    /** Statuses that anyone can read and that count towards the post counters. */
    private static final Set<PostStatus> PUBLIC_STATUSES = EnumSet.of(PostStatus.PUBLISHED, PostStatus.LOCKED);

    private final PostRepository postRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final AuthenticatedUserResolver currentUser;
    private final TransactionTemplate transactionTemplate;

    /**
     * Creates a post authored by the caller, published or as a draft.
     *
     * <p>The slug is derived from the title and suffixed ({@code -2},
     * {@code -3}, ...) when taken. Two requests with the same title can still
     * pick the same slug at the same moment; the loser fails on the unique
     * constraint. PostgreSQL aborts the whole transaction on that error, so
     * each attempt runs in a transaction of its own and the next one sees the
     * winner's slug.
     *
     * @throws AppException HTTP 400 if the category does not exist
     */
    @PreAuthorize("isAuthenticated()")
    public PostDto create(CreatePostRequest request) {
        for (int attempt = 1; ; attempt++) {
            try {
                return transactionTemplate.execute(status -> createOnce(request));
            } catch (DataIntegrityViolationException e) {
                if (attempt >= MAX_SLUG_ATTEMPTS || !violates(e, SLUG_CONSTRAINT)) {
                    throw e;
                }
            }
        }
    }

    private PostDto createOnce(CreatePostRequest request) {
        User author = currentUser.currentUser();
        Category category = resolveCategory(request.getCategoryId());
        Set<String> taken = postRepository.findSlugsTakenFor(SlugUtil.slugify(request.getTitle()));

        Post post = Post.builder()
                .author(author)
                .category(category)
                .title(request.getTitle())
                .slug(SlugUtil.uniqueSlug(request.getTitle(), taken::contains))
                .content(request.getContent())
                .status(request.isDraft() ? PostStatus.DRAFT : PostStatus.PUBLISHED)
                .tags(resolveTags(request.getTags()))
                .lastActivityAt(OffsetDateTime.now())
                .build();
        postRepository.save(post);

        adjustCounters(author.getId(), Set.of(), false, post.getTags(), isPublic(post.getStatus()));
        return PostDto.from(reload(post.getSlug()));
    }

    /**
     * Returns the post with the given slug.
     *
     * @throws AppException HTTP 404 if it does not exist, is deleted, or is a
     *                      draft the caller may not see
     */
    @Transactional(readOnly = true)
    public PostDto getBySlug(String slug) {
        return PostDto.from(loadReadable(slug));
    }

    /**
     * Updates a post. Fields that are {@code null} in the request stay as
     * they are; {@code tags} replaces the whole tag set.
     *
     * @throws AppException HTTP 403 if a non-staff caller edits a locked post
     *                      or locks a post; HTTP 404 if it is not readable;
     *                      HTTP 400 if the category does not exist
     */
    @Transactional
    @PreAuthorize("@postSecurity.canModify(#slug, authentication)")
    public PostDto update(String slug, UpdatePostRequest request) {
        Post post = loadReadable(slug);
        requireEditable(post);

        PostStatus statusBefore = post.getStatus();
        Set<Tag> tagsBefore = new HashSet<>(post.getTags());

        if (request.getTitle() != null) {
            post.setTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            post.setContent(request.getContent());
        }
        if (request.getCategoryId() != null) {
            post.setCategory(resolveCategory(request.getCategoryId()));
        }
        if (request.getTags() != null) {
            post.getTags().clear();
            post.getTags().addAll(resolveTags(request.getTags()));
        }
        if (request.getStatus() != null) {
            PostStatus target = PostStatus.valueOf(request.getStatus());
            if (target == PostStatus.LOCKED && statusBefore != PostStatus.LOCKED && !isStaff(auth())) {
                throw new AppException("Only moderators can lock a post", HttpStatus.FORBIDDEN);
            }
            post.setStatus(target);
        }
        post.setLastActivityAt(OffsetDateTime.now());
        postRepository.save(post);

        adjustCounters(post.getAuthor().getId(),
                tagsBefore, isPublic(statusBefore), post.getTags(), isPublic(post.getStatus()));
        return PostDto.from(reload(slug));
    }

    /**
     * Soft-deletes a post by setting its status to {@link PostStatus#DELETED}.
     *
     * @throws AppException HTTP 403 if a non-staff caller deletes a locked
     *                      post; HTTP 404 if it is not readable (including
     *                      already deleted)
     */
    @Transactional
    @PreAuthorize("@postSecurity.canModify(#slug, authentication)")
    public void delete(String slug) {
        Post post = loadReadable(slug);
        requireEditable(post);

        boolean wasPublic = isPublic(post.getStatus());
        post.setStatus(PostStatus.DELETED);
        postRepository.save(post);

        adjustCounters(post.getAuthor().getId(), post.getTags(), wasPublic, post.getTags(), false);
    }

    /**
     * Pins or unpins a post.
     *
     * @throws AppException HTTP 404 if the post is not readable
     */
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public PostDto togglePin(String slug) {
        Post post = loadReadable(slug);
        post.setPinned(!post.isPinned());
        return PostDto.from(postRepository.save(post));
    }

    /**
     * Returns a page of posts matching {@code filter}.
     *
     * <p>Without a status filter only public posts ({@code PUBLISHED} and
     * {@code LOCKED}) are listed. A requested status is honoured only if the
     * caller may see it — {@code DELETED} for staff, {@code DRAFT} for admins
     * or for the author's own drafts ({@code author} set to the caller) — and
     * is otherwise ignored.
     */
    @Transactional(readOnly = true)
    public Page<PostSummaryDto> search(PostFilter filter, Pageable pageable) {
        List<Specification<Post>> specs = new ArrayList<>();
        if (StringUtils.hasText(filter.q())) {
            specs.add(PostSpecifications.textMatches(filter.q().trim()));
        }
        if (filter.categoryId() != null) {
            specs.add(PostSpecifications.byCategoryId(filter.categoryId()));
        }
        if (StringUtils.hasText(filter.categorySlug())) {
            specs.add(PostSpecifications.byCategorySlug(filter.categorySlug()));
        }
        if (StringUtils.hasText(filter.tag())) {
            specs.add(PostSpecifications.byTagSlug(filter.tag()));
        }
        if (StringUtils.hasText(filter.author())) {
            specs.add(PostSpecifications.byAuthorUsername(filter.author()));
        }
        specs.add(mayList(filter.status(), filter.author())
                ? PostSpecifications.statusEquals(filter.status())
                : PostSpecifications.statusIn(PUBLIC_STATUSES));

        return postRepository.findAll(Specification.allOf(specs), pageable).map(PostSummaryDto::from);
    }

    private static boolean mayList(PostStatus status, String author) {
        if (status == null) {
            return false;
        }
        Authentication auth = auth();
        return switch (status) {
            case PUBLISHED, LOCKED -> true;
            case DELETED -> isStaff(auth);
            case DRAFT -> isAdmin(auth) || (author != null && isUser(auth, author));
        };
    }

    /** Loads a post the caller may read, or throws 404. */
    private Post loadReadable(String slug) {
        Post post = postRepository.findBySlug(slug)
                .orElseThrow(PostService::notFound);
        if (post.getStatus() == PostStatus.DELETED) {
            throw notFound();
        }
        if (post.getStatus() == PostStatus.DRAFT
                && !isAdmin(auth()) && !isUser(auth(), post.getAuthor().getUsername())) {
            throw notFound();
        }
        return post;
    }

    /** Locked posts may only be changed by staff. */
    private static void requireEditable(Post post) {
        if (post.getStatus() == PostStatus.LOCKED && !isStaff(auth())) {
            throw new AppException("Post is locked", HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Loads the post again after the counter updates, which clear the
     * persistence context, so the response shows the current tag counts.
     */
    private Post reload(String slug) {
        return postRepository.findBySlug(slug).orElseThrow(PostService::notFound);
    }

    private Category resolveCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new AppException("Category not found", HttpStatus.BAD_REQUEST));
    }

    /**
     * Returns the tags with the given names, creating the missing ones. Names
     * are stored lower-case and double as slugs; duplicates collapse.
     */
    private Set<Tag> resolveTags(List<String> names) {
        if (names == null || names.isEmpty()) {
            return new LinkedHashSet<>();
        }
        Set<String> slugs = names.stream()
                .map(name -> name.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<String, Tag> bySlug = new HashMap<>();
        tagRepository.findBySlugIn(slugs).forEach(tag -> bySlug.put(tag.getSlug(), tag));
        List<String> missing = slugs.stream().filter(slug -> !bySlug.containsKey(slug)).toList();
        if (!missing.isEmpty()) {
            missing.forEach(tagRepository::insertIfAbsent);
            tagRepository.findBySlugIn(missing).forEach(tag -> bySlug.put(tag.getSlug(), tag));
        }
        return slugs.stream().map(bySlug::get).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    /**
     * Moves the public post counters from the state before a change to the
     * state after it: tags that are no longer counted lose one, newly counted
     * tags gain one, and the author's counter follows the post's visibility.
     */
    private void adjustCounters(Long authorId,
                                Set<Tag> tagsBefore, boolean publicBefore,
                                Set<Tag> tagsAfter, boolean publicAfter) {
        Set<Long> before = publicBefore ? ids(tagsBefore) : Set.of();
        Set<Long> after = publicAfter ? ids(tagsAfter) : Set.of();

        Set<Long> removed = new HashSet<>(before);
        removed.removeAll(after);
        Set<Long> added = new HashSet<>(after);
        added.removeAll(before);

        if (!removed.isEmpty()) {
            tagRepository.adjustPostCount(removed, -1);
        }
        if (!added.isEmpty()) {
            tagRepository.adjustPostCount(added, 1);
        }
        if (publicBefore != publicAfter) {
            userRepository.adjustPostCount(authorId, publicAfter ? 1 : -1);
        }
    }

    private static Set<Long> ids(Set<Tag> tags) {
        return tags.stream().map(Tag::getId).collect(Collectors.toSet());
    }

    private static boolean isPublic(PostStatus status) {
        return PUBLIC_STATUSES.contains(status);
    }

    private static boolean violates(DataIntegrityViolationException e, String constraint) {
        for (Throwable cause = e; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException cve) {
                return constraint.equals(cve.getConstraintName());
            }
        }
        return false;
    }

    private static Authentication auth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    private static AppException notFound() {
        return new AppException("Post not found", HttpStatus.NOT_FOUND);
    }
}
