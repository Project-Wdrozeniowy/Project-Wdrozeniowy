package com.devpulse.forum.service;

import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CreateCategoryRequest;
import com.devpulse.forum.dto.UpdateCategoryRequest;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.repository.CategoryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

import java.sql.SQLException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.entry;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * The conflicts {@link CategoryService} can only see from the database: two
 * requests that pass the uniqueness check at the same moment. The API test
 * covers the checked conflicts.
 */
@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryService categoryService;

    @Test
    void aSlugTakenByAConcurrentCreateIsAConflictOnTheSlug() throws Exception {
        when(categoryRepository.saveAndFlush(any())).thenThrow(violation("categories_slug_key"));

        assertThatThrownBy(() -> categoryService.create(create("{\"name\": \"Rust\", \"slug\": \"rust\"}")))
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(e.getFieldErrors()).containsExactly(entry("slug", CategoryService.SLUG_TAKEN_MESSAGE));
                });
    }

    @Test
    void aNameTakenByAConcurrentUpdateIsAConflictOnTheName() throws Exception {
        when(categoryRepository.findBySlug("rust"))
                .thenReturn(Optional.of(Category.builder().id(5L).name("Rust").slug("rust").build()));
        when(categoryRepository.saveAndFlush(any())).thenThrow(violation("categories_name_key"));

        assertThatThrownBy(() -> categoryService.update("rust", update("{\"name\": \"Go\"}")))
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(e.getFieldErrors()).containsExactly(entry("name", CategoryService.NAME_TAKEN_MESSAGE));
                });
    }

    @Test
    void anyOtherIntegrityViolationIsNotTurnedIntoAConflict() throws Exception {
        DataIntegrityViolationException other = violation("categories_pkey");
        when(categoryRepository.saveAndFlush(any())).thenThrow(other);

        assertThatThrownBy(() -> categoryService.create(create("{\"name\": \"Rust\", \"slug\": \"rust\"}")))
                .isSameAs(other);
    }

    @Test
    void aViolationWithoutAConstraintIsRethrown() throws Exception {
        DataIntegrityViolationException other = new DataIntegrityViolationException("value too long");
        when(categoryRepository.saveAndFlush(any())).thenThrow(other);

        assertThatThrownBy(() -> categoryService.create(create("{\"name\": \"Rust\", \"slug\": \"rust\"}")))
                .isSameAs(other);
    }

    private static DataIntegrityViolationException violation(String constraint) {
        return new DataIntegrityViolationException("write failed",
                new ConstraintViolationException("duplicate key", new SQLException(), constraint));
    }

    private static CreateCategoryRequest create(String json) throws Exception {
        return JSON.readValue(json, CreateCategoryRequest.class);
    }

    private static UpdateCategoryRequest update(String json) throws Exception {
        return JSON.readValue(json, UpdateCategoryRequest.class);
    }
}
