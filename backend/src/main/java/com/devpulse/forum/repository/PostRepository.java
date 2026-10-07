package com.devpulse.forum.repository;

import com.devpulse.forum.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.Set;

/**
 * JPA repository for {@link Post}.
 *
 * <p>Extends {@link JpaSpecificationExecutor} so the service layer can compose
 * dynamic queries for search and filtering (PWDRZ-69) without hand-written
 * JPQL.
 */
public interface PostRepository extends JpaRepository<Post, Long>, JpaSpecificationExecutor<Post> {

    /** Loads a single post together with everything {@code PostDto} needs. */
    @EntityGraph(attributePaths = {"author", "category", "tags"})
    Optional<Post> findBySlug(String slug);

    /**
     * Returns {@code base} and every {@code base-*} slug that is already
     * taken, so a free suffix can be picked with one query instead of probing
     * {@code base-2}, {@code base-3}, ... one by one. Slugs only contain
     * {@code [a-z0-9-]}, so {@code base} needs no LIKE escaping.
     */
    @Query("SELECT p.slug FROM Post p WHERE p.slug = :base OR p.slug LIKE CONCAT(:base, '-%')")
    Set<String> findSlugsTakenFor(@Param("base") String base);

    /**
     * Overrides the inherited specification search to eagerly fetch
     * {@code author} and {@code category} (both {@code FetchType.LAZY}),
     * avoiding an N+1 query per post per association when the listing
     * endpoint maps results to DTOs after the transaction has closed.
     *
     * <p>Both associations are {@code @ManyToOne}, so the entity graph
     * doesn't fan out rows — the separate count query used for pagination
     * is unaffected.
     */
    @Override
    @EntityGraph(attributePaths = {"author", "category"})
    Page<Post> findAll(Specification<Post> spec, Pageable pageable);
}
