package com.devpulse.forum.controller;

import com.devpulse.forum.dto.CategoryDto;
import com.devpulse.forum.dto.CreateCategoryRequest;
import com.devpulse.forum.dto.UpdateCategoryRequest;
import com.devpulse.forum.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller exposing forum categories.
 *
 * <p>Reading is public (configured in {@link com.devpulse.config.SecurityConfig})
 * and leaves hidden categories out. Creating, editing and deleting categories
 * is for administrators; it finds a category by slug whether it is visible or
 * not.
 */
@Tag(name = "Forum – Categories", description = "Browse and manage forum categories")
@RestController
@RequestMapping("/forum/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    /** Returns the visible categories in display order, then by name. */
    @Operation(summary = "List the visible categories in display order")
    @ApiResponse(responseCode = "200", description = "Category list returned")
    @GetMapping
    public List<CategoryDto> listCategories() {
        return categoryService.listVisible();
    }

    /** Creates a category; administrators only. */
    @Operation(summary = "Create a category", security = @SecurityRequirement(name = "bearerAuth"),
            description = "Administrators only. The name is unique ignoring case and the slug is unique.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Category created"),
        @ApiResponse(responseCode = "400", description = "Validation error; errors names the fields"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Admin role required"),
        @ApiResponse(responseCode = "409", description = "Name or slug taken; errors.name or errors.slug says which")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryDto createCategory(@Valid @RequestBody CreateCategoryRequest request) {
        return categoryService.create(request);
    }

    /** Returns the visible category identified by slug. */
    @Operation(summary = "Get a category by slug")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Category found"),
        @ApiResponse(responseCode = "404", description = "Not found or hidden")
    })
    @GetMapping("/{slug}")
    public CategoryDto getCategory(
            @Parameter(description = "Category slug", example = "ai")
            @PathVariable String slug) {
        return categoryService.getVisible(slug);
    }

    /** Updates a visible or hidden category; administrators only. */
    @Operation(summary = "Update a category by slug", security = @SecurityRequirement(name = "bearerAuth"),
            description = "Administrators only; works on hidden categories too. Omitted fields stay as they are.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Category updated"),
        @ApiResponse(responseCode = "400", description = "Validation error; errors names the fields"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Admin role required"),
        @ApiResponse(responseCode = "404", description = "No category has this slug"),
        @ApiResponse(responseCode = "409", description = "Name or slug taken; errors.name or errors.slug says which")
    })
    @PatchMapping("/{slug}")
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryDto updateCategory(
            @Parameter(description = "Category slug", example = "general-discussion") @PathVariable String slug,
            @Valid @RequestBody UpdateCategoryRequest request) {
        return categoryService.update(slug, request);
    }

    /** Deletes a visible or hidden category and keeps its posts; administrators only. */
    @Operation(summary = "Delete a category by slug", security = @SecurityRequirement(name = "bearerAuth"),
            description = "Administrators only; works on hidden categories too. The category's posts stay, "
                    + "without a category.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Category deleted"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Admin role required"),
        @ApiResponse(responseCode = "404", description = "No category has this slug")
    })
    @DeleteMapping("/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteCategory(
            @Parameter(description = "Category slug", example = "general-discussion") @PathVariable String slug) {
        categoryService.delete(slug);
    }
}
