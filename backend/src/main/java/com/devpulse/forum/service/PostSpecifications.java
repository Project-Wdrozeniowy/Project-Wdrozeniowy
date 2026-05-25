package com.devpulse.forum.service;

import com.devpulse.auth.entity.User;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

/**
 * Reusable {@link Specification} factories for {@link Post} queries.
 *
 * <p>Each factory returns a specification that contributes a single
 * {@link Predicate} to the final {@code WHERE} clause. Composition is left
 * to the caller via {@link Specification#where(Specification)} and
 * {@link Specification#and(Specification)}.
 */
public final class PostSpecifications {

    private PostSpecifications() {
    }

    /** Case-insensitive substring match against the post title. */
    public static Specification<Post> titleContains(String q) {
        return (root, query, cb) ->
                cb.like(cb.lower(root.get("title")), "%" + q.toLowerCase() + "%");
    }

    /** Case-insensitive substring match against the post content. */
    public static Specification<Post> contentContains(String q) {
        return (root, query, cb) ->
                cb.like(cb.lower(root.get("content")), "%" + q.toLowerCase() + "%");
    }

    /** Free-text search across title <em>and</em> content. */
    public static Specification<Post> textMatches(String q) {
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("title")), "%" + q.toLowerCase() + "%"),
                cb.like(cb.lower(root.get("content")), "%" + q.toLowerCase() + "%"));
    }

    /** Restrict to a category by numeric id. */
    public static Specification<Post> byCategoryId(Long categoryId) {
        return (root, query, cb) -> {
            Join<Post, Category> join = root.join("category");
            return cb.equal(join.get("id"), categoryId);
        };
    }

    /** Restrict to a category by slug. */
    public static Specification<Post> byCategorySlug(String slug) {
        return (root, query, cb) -> {
            Join<Post, Category> join = root.join("category");
            return cb.equal(join.get("slug"), slug);
        };
    }

    /** Restrict to a single author by username. */
    public static Specification<Post> byAuthorUsername(String username) {
        return (root, query, cb) -> {
            Join<Post, User> join = root.join("author");
            return cb.equal(join.get("username"), username);
        };
    }

    /** Restrict to a single status (e.g. {@link PostStatus#PUBLISHED}). */
    public static Specification<Post> statusEquals(PostStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }
}
