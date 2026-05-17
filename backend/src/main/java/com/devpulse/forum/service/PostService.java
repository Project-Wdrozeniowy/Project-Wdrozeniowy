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
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Business logic for the forum post CRUD endpoints.
 *
 * <p>Authorization rules:
 * <ul>
 *   <li>Anyone authenticated may create a post.</li>
 *   <li>Update and delete are restricted to the author, moderators and admins
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

    /** Creates a new post authored by the caller. */
    @Transactional
    @PreAuthorize("isAuthenticated()")
    public PostResponse create(CreatePostRequest request) {
        User author = currentUser.currentUser();
        Category category = resolveCategory(request.getCategoryId());

        Post post = Post.builder()
                .author(author)
                .category(category)
                .title(request.getTitle())
                .slug(SlugUtil.uniqueSlug(request.getTitle(), postRepository::existsBySlug))
                .content(request.getContent())
                .status(PostStatus.PUBLISHED)
                .lastActivityAt(OffsetDateTime.now())
                .build();
        return PostResponse.from(postRepository.save(post));
    }

    /** Returns the post by id; throws 404 if missing or soft-deleted (for non-staff). */
    @Transactional(readOnly = true)
    public PostResponse getById(Long id) {
        return PostResponse.from(loadVisible(id));
    }

    /** Returns the post by slug; throws 404 if missing or soft-deleted (for non-staff). */
    @Transactional(readOnly = true)
    public PostResponse getBySlug(String slug) {
        Post post = postRepository.findBySlug(slug)
                .orElseThrow(() -> new AppException("Post not found", HttpStatus.NOT_FOUND));
        if (post.getStatus() == PostStatus.DELETED) {
            throw new AppException("Post not found", HttpStatus.NOT_FOUND);
        }
        return PostResponse.from(post);
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
        if (post.getStatus() == PostStatus.DELETED) {
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
