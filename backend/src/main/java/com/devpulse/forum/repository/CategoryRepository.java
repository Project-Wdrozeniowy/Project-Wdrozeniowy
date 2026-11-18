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

    /** Whether a category other than {@code id} has this name, ignoring case; any category when {@code id} is null. */
    default boolean nameTaken(String name, Long id) {
        return id == null ? existsByNameIgnoreCase(name) : existsByNameIgnoreCaseAndIdNot(name, id);
    }

    /** Whether a category other than {@code id} has this slug; any category when {@code id} is null. */
    default boolean slugTaken(String slug, Long id) {
        return id == null ? existsBySlug(slug) : existsBySlugAndIdNot(slug, id);
    }

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);
}
