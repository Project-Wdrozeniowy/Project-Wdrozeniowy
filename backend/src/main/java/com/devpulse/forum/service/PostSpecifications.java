package com.devpulse.forum.service;

import com.devpulse.auth.entity.User;
import com.devpulse.common.util.LikePatterns;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.entity.Tag;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.Locale;

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

    /**
     * Case-insensitive substring search across title <em>and</em> content.
     * {@code %} and {@code _} in {@code q} match literally, so searching for
     * "100%" doesn't turn into a wildcard.
     */
    public static Specification<Post> textMatches(String q) {
        String pattern = LikePatterns.containing(q);
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("title")), pattern, LikePatterns.ESCAPE),
                cb.like(cb.lower(root.get("content")), pattern, LikePatterns.ESCAPE));
    }

    /** Restrict to posts carrying the tag with the given slug. */
    public static Specification<Post> byTagSlug(String slug) {
        return (root, query, cb) -> {
            Join<Post, Tag> join = root.join("tags");
            return cb.equal(join.get("slug"), slug.toLowerCase(Locale.ROOT));
        };
    }

    /** Restrict to a category by numeric id. */
    public static Specification<Post> byCategoryId(Long categoryId) {
        return (root, query, cb) -> {
            Join<Post, Category> join = root.join("category");
            return cb.equal(join.get("id"), categoryId);
        };
    }

    /** Restrict to posts without a category, including those whose category was deleted. */
    public static Specification<Post> withoutCategory() {
        return (root, query, cb) -> cb.isNull(root.get("category"));
    }

    /** Restrict to posts created at or after {@code from}. */
    public static Specification<Post> createdFrom(OffsetDateTime from) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    /** Restrict to posts created before {@code to}. */
    public static Specification<Post> createdBefore(OffsetDateTime to) {
        return (root, query, cb) -> cb.lessThan(root.get("createdAt"), to);
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

    /** Restrict to any of the given statuses. */
    public static Specification<Post> statusIn(Collection<PostStatus> statuses) {
        return (root, query, cb) -> root.get("status").in(statuses);
    }
}
