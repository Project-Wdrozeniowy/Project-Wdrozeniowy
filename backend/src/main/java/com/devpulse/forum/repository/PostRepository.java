package com.devpulse.forum.repository;

import com.devpulse.forum.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

/**
 * JPA repository for {@link Post}.
 *
 * <p>Extends {@link JpaSpecificationExecutor} so the service layer can compose
 * dynamic queries for search and filtering (PWDRZ-69) without hand-written
 * JPQL.
 */
public interface PostRepository extends JpaRepository<Post, Long>, JpaSpecificationExecutor<Post> {

    Optional<Post> findBySlug(String slug);

    boolean existsBySlug(String slug);

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
