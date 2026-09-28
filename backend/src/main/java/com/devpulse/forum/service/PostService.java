package com.devpulse.forum.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CreatePostRequest;
import com.devpulse.forum.dto.PostResponse;
import com.devpulse.forum.dto.UpdatePostRequest;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.CategoryRepository;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.forum.util.SlugUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Business logic for the forum post CRUD endpoints.
 *
 * <p>Authorization rules:
 * <ul>
 *   <li>Anyone authenticated may create a post.</li>
 *   <li>Update and delete are restricted to the author and admins
 *       via {@link com.devpulse.forum.security.PostSecurity}.</li>
 * </ul>
 *
 * <p>Deletion is implemented as a soft-delete (status set to
 * {@link PostStatus#DELETED}) so that comments and votes referencing the post
 * remain valid.
 */
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final CategoryRepository categoryRepository;
    private final AuthenticatedUserResolver currentUser;

    /** Number of times to retry with a new slug suffix if a concurrent insert wins the race. */
    private static final int MAX_SLUG_RETRIES = 3;

    /**
     * Creates a new post authored by the caller.
     *
     * <p>Slug uniqueness is checked up front, but that check-then-act isn't
     * airtight under concurrency: two requests for the same title can both
     * pass {@link SlugUtil#uniqueSlug} before either saves. If the database's
     * unique constraint on {@code posts.slug} rejects the insert, we retry a
     * few times with a fresh random suffix rather than surfacing a 500.
     */
    @Transactional
    @PreAuthorize("isAuthenticated()")
    public PostResponse create(CreatePostRequest request) {
        User author = currentUser.currentUser();
        Category category = resolveCategory(request.getCategoryId());

        String slug = SlugUtil.uniqueSlug(request.getTitle(), postRepository::existsBySlug);
        Post post = Post.builder()
                .author(author)
                .category(category)
                .title(request.getTitle())
                .slug(slug)
                .content(request.getContent())
                .status(PostStatus.PUBLISHED)
                .lastActivityAt(OffsetDateTime.now())
                .build();

        for (int attempt = 1; ; attempt++) {
            try {
                return PostResponse.from(postRepository.save(post));
            } catch (DataIntegrityViolationException e) {
                if (attempt >= MAX_SLUG_RETRIES) {
                    throw e;
                }
                post.setSlug(slug + "-" + ThreadLocalRandom.current().nextInt(1000, 10000));
            }
        }
    }

    /** Returns the post by id; throws 404 if missing, soft-deleted, or an unpublished draft (for non-staff). */
    @Transactional(readOnly = true)
    public PostResponse getById(Long id) {
        return PostResponse.from(loadVisible(id));
    }

    /** Returns the post by slug; throws 404 if missing, soft-deleted, or an unpublished draft (for non-staff). */
    @Transactional(readOnly = true)
    public PostResponse getBySlug(String slug) {
        Post post = postRepository.findBySlug(slug)
                .orElseThrow(() -> new AppException("Post not found", HttpStatus.NOT_FOUND));
        return PostResponse.from(requireVisible(post));
    }

    /** Updates a post; authorization is enforced by {@link com.devpulse.forum.security.PostSecurity}. */
    @Transactional
    @PreAuthorize("@postSecurity.isAuthorOrStaff(#id, authentication)")
    public PostResponse update(Long id, UpdatePostRequest request) {
        Post post = loadVisible(id);

        if (request.getTitle() != null) {
            post.setTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            post.setContent(request.getContent());
        }
        if (Boolean.TRUE.equals(request.getClearCategory())) {
            post.setCategory(null);
        } else if (request.getCategoryId() != null) {
            post.setCategory(resolveCategory(request.getCategoryId()));
        }
        post.setLastActivityAt(OffsetDateTime.now());

        return PostResponse.from(postRepository.save(post));
    }

    /**
     * Returns a paginated list of posts matching the given criteria.
     *
     * <p>Non-staff callers are silently restricted to {@link PostStatus#PUBLISHED}
     * posts — they cannot ask for drafts or deleted posts by passing a status
     * query parameter.
     *
     * @param q             free-text query matched against title and content (nullable)
     * @param categoryId    optional category filter by id
     * @param categorySlug  optional category filter by slug
     * @param author        optional author username filter
     * @param status        optional status filter (ignored for non-staff)
     * @param pageable      pagination + sort
     * @return page of matching posts as lightweight summaries
     */
    @Transactional(readOnly = true)
    public Page<Post> search(String q,
                             Long categoryId,
                             String categorySlug,
                             String author,
                             PostStatus status,
                             Pageable pageable) {
        List<Specification<Post>> specs = new ArrayList<>();
        if (StringUtils.hasText(q)) {
            specs.add(PostSpecifications.textMatches(q.trim()));
        }
        if (categoryId != null) {
            specs.add(PostSpecifications.byCategoryId(categoryId));
        }
        if (StringUtils.hasText(categorySlug)) {
            specs.add(PostSpecifications.byCategorySlug(categorySlug));
        }
        if (StringUtils.hasText(author)) {
            specs.add(PostSpecifications.byAuthorUsername(author));
        }

        PostStatus effectiveStatus = isStaff() ? status : PostStatus.PUBLISHED;
        if (effectiveStatus != null) {
            specs.add(PostSpecifications.statusEquals(effectiveStatus));
        } else {
            // Staff with no explicit filter — still hide soft-deleted posts by default.
            specs.add((root, query, cb) -> cb.notEqual(root.get("status"), PostStatus.DELETED));
        }

        Specification<Post> combined = specs.stream().reduce(Specification::and).orElse(null);
        return postRepository.findAll(combined, pageable);
    }

    private static boolean isStaff() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        for (GrantedAuthority authority : auth.getAuthorities()) {
            String name = authority.getAuthority();
            if ("ROLE_ADMIN".equals(name)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isAuthor(Post post) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || post.getAuthor() == null) {
            return false;
        }
        return post.getAuthor().getUsername().equals(auth.getName());
    }

    /** Soft-deletes a post by flipping its status. */
    @Transactional
    @PreAuthorize("@postSecurity.isAuthorOrStaff(#id, authentication)")
    public void delete(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new AppException("Post not found", HttpStatus.NOT_FOUND));
        if (post.getStatus() == PostStatus.DELETED) {
            return; // idempotent
        }
        post.setStatus(PostStatus.DELETED);
        postRepository.save(post);
    }

    private Post loadVisible(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new AppException("Post not found", HttpStatus.NOT_FOUND));
        return requireVisible(post);
    }

    /**
     * Throws 404 if {@code post} is soft-deleted, or is an unpublished draft
     * being fetched directly by someone other than its author or staff.
     */
    private Post requireVisible(Post post) {
        if (post.getStatus() == PostStatus.DELETED) {
            throw new AppException("Post not found", HttpStatus.NOT_FOUND);
        }
        if (post.getStatus() == PostStatus.DRAFT && !isStaff() && !isAuthor(post)) {
            throw new AppException("Post not found", HttpStatus.NOT_FOUND);
        }
        return post;
    }

    private Category resolveCategory(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new AppException("Category not found", HttpStatus.BAD_REQUEST));
    }
}
