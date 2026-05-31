package com.devpulse.forum.repository;

import com.devpulse.forum.entity.Post;
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
}
