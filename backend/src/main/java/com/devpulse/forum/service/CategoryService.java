package com.devpulse.forum.service;

import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CategoryDto;
import com.devpulse.forum.dto.CreateCategoryRequest;
import com.devpulse.forum.dto.UpdateCategoryRequest;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Forum categories: reading for everyone, signed in or not, and management
 * for administrators (the controller checks the role).
 *
 * <p>The public reads leave hidden categories out. Management finds a
 * category by slug whether it is visible or not, so a hidden category can be
 * shown again. Names are unique ignoring case and slugs are unique; a taken
 * one is a 409 that names the field. The unique constraints on
 * {@code categories.name} and {@code categories.slug} catch the race between
 * that check and the write, so a concurrent request also ends in 409.
 */
@Service
@RequiredArgsConstructor
public class CategoryService {

    /** The {@code errors.name} message of the 409 for a name another category has. */
    static final String NAME_TAKEN_MESSAGE = "Name is already used by another category";

    /** The {@code errors.slug} message of the 409 for a slug another category has. */
    static final String SLUG_TAKEN_MESSAGE = "Slug is already used by another category";

    /** Unique constraints of the {@code categories} table, named by PostgreSQL in migration V2. */
    private static final Map<String, String> UNIQUE_CONSTRAINTS = Map.of(
            "categories_name_key", "name",
            "categories_slug_key", "slug");

    private final CategoryRepository categoryRepository;

    /** Returns the visible categories in display order, then by name. */
    @Transactional(readOnly = true)
    public List<CategoryDto> listVisible() {
        return categoryRepository.findByIsVisibleTrueOrderByDisplayOrderAscNameAsc().stream()
                .map(CategoryDto::from)
                .toList();
    }

    /**
     * Returns the visible category with the given slug.
     *
     * @throws AppException HTTP 404 if no visible category has this slug
     */
    @Transactional(readOnly = true)
    public CategoryDto getVisible(String slug) {
        return categoryRepository.findBySlugAndIsVisibleTrue(slug)
                .map(CategoryDto::from)
                .orElseThrow(CategoryService::notFound);
    }

    /**
     * Creates a category. A blank description is stored as none and a missing
     * display order as 0.
     *
     * @throws AppException HTTP 409 if the name or the slug is taken
     */
    @Transactional
    public CategoryDto create(CreateCategoryRequest request) {
        String name = request.getName().trim();
        rejectTaken(name, request.getSlug(), null);

        Category category = Category.builder()
                .name(name)
                .slug(request.getSlug())
                .description(blankToNull(request.getDescription()))
                .displayOrder(request.getDisplayOrder() == null ? 0 : request.getDisplayOrder())
                .isVisible(request.isVisible())
                .build();
        return CategoryDto.from(saveAndFlush(category));
    }

    /**
     * Updates the category with the given slug, visible or hidden. Fields that
     * are {@code null} in the request stay as they are; an empty description
     * removes it.
     *
     * @throws AppException HTTP 404 if no category has this slug,
     *                      HTTP 409 if the new name or slug is taken
     */
    @Transactional
    public CategoryDto update(String slug, UpdateCategoryRequest request) {
        Category category = categoryRepository.findBySlug(slug).orElseThrow(CategoryService::notFound);
        String name = request.getName() == null ? null : request.getName().trim();
        rejectTaken(name, request.getSlug(), category.getId());

        if (name != null) {
            category.setName(name);
        }
        if (request.getSlug() != null) {
            category.setSlug(request.getSlug());
        }
        if (request.getDescription() != null) {
            category.setDescription(blankToNull(request.getDescription()));
        }
        if (request.getDisplayOrder() != null) {
            category.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getVisible() != null) {
            category.setIsVisible(request.getVisible());
        }
        return CategoryDto.from(saveAndFlush(category));
    }

    /**
     * Deletes the category with the given slug, visible or hidden. Its posts
     * stay and become uncategorised: the foreign key {@code posts.category_id}
     * is {@code ON DELETE SET NULL}.
     *
     * @throws AppException HTTP 404 if no category has this slug
     */
    @Transactional
    public void delete(String slug) {
        Category category = categoryRepository.findBySlug(slug).orElseThrow(CategoryService::notFound);
        categoryRepository.delete(category);
        categoryRepository.flush();
    }

    /** Throws the 409 for whichever of {@code name} and {@code slug} another category has; null ones are skipped. */
    private void rejectTaken(String name, String slug, Long id) {
        Map<String, String> taken = new LinkedHashMap<>();
        if (name != null && categoryRepository.nameTaken(name, id)) {
            taken.put("name", NAME_TAKEN_MESSAGE);
        }
        if (slug != null && categoryRepository.slugTaken(slug, id)) {
            taken.put("slug", SLUG_TAKEN_MESSAGE);
        }
        if (!taken.isEmpty()) {
            throw conflict(taken);
        }
    }

    private Category saveAndFlush(Category category) {
        try {
            return categoryRepository.saveAndFlush(category);
        } catch (DataIntegrityViolationException e) {
            String field = violatedField(e);
            if (field == null) {
                throw e;
            }
            throw conflict(Map.of(field, "name".equals(field) ? NAME_TAKEN_MESSAGE : SLUG_TAKEN_MESSAGE));
        }
    }

    /** The request field of the unique constraint {@code e} violates, or {@code null} for any other violation. */
    private static String violatedField(DataIntegrityViolationException e) {
        for (Throwable cause = e; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException cve) {
                return UNIQUE_CONSTRAINTS.get(cve.getConstraintName());
            }
        }
        return null;
    }

    private static AppException conflict(Map<String, String> fieldErrors) {
        return new AppException("Category name or slug already exists", HttpStatus.CONFLICT, fieldErrors);
    }

    private static AppException notFound() {
        return new AppException("Category not found", HttpStatus.NOT_FOUND);
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
