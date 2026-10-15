package com.devpulse.forum.service;

import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CategoryDto;
import com.devpulse.forum.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read access to forum categories for everyone, signed in or not.
 *
 * <p>Hidden categories are left out of every result. Creating, editing and
 * deleting categories is planned under PWDRZ-141.
 */
@Service
@RequiredArgsConstructor
public class CategoryService {

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
                .orElseThrow(() -> new AppException("Category not found", HttpStatus.NOT_FOUND));
    }
}
