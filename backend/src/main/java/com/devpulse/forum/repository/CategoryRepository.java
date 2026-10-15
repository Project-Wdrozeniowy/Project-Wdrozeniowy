package com.devpulse.forum.repository;

import com.devpulse.forum.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * JPA repository for {@link Category}.
 */
public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findBySlug(String slug);

    /** Visible categories in display order, then by name. */
    List<Category> findByIsVisibleTrueOrderByDisplayOrderAscNameAsc();

    Optional<Category> findBySlugAndIsVisibleTrue(String slug);
}
