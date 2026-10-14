package com.devpulse.forum.controller;

import com.devpulse.forum.dto.CategoryDto;
import com.devpulse.forum.dto.CreateCategoryRequest;
import com.devpulse.forum.dto.UpdateCategoryRequest;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Planned forum category endpoints, implemented under PWDRZ-140 (reading)
 * and PWDRZ-141 (admin management).
 *
 * <p>Every operation still answers {@code 501 Not Implemented}, so the
 * controller is hidden from the published OpenAPI contract and its
 * annotations serve as the design reference. When an operation is
 * implemented, move {@code @Hidden} from the class to the operations that
 * are still stubs; {@code OpenApiContractTest} fails while an implemented
 * operation is hidden or a stub is published.
 */
@Hidden
@Tag(name = "Forum – Categories", description = "Browse and manage forum categories")
@RestController
@RequestMapping("/forum/categories")
public class CategoryController {

    @Operation(summary = "List all visible categories")
    @ApiResponse(responseCode = "200", description = "Category list returned")
    @GetMapping
    public List<CategoryDto> listCategories() {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Create a new category", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Category created"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "403", description = "Admin role required"),
        @ApiResponse(responseCode = "409", description = "Slug already exists")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryDto createCategory(@Valid @RequestBody CreateCategoryRequest request) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Get a category by slug")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Category found"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @GetMapping("/{slug}")
    public CategoryDto getCategory(
            @Parameter(description = "Category slug", example = "general-discussion")
            @PathVariable String slug) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Update a category by slug", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Category updated"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "403", description = "Admin role required"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PatchMapping("/{slug}")
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryDto updateCategory(
            @Parameter(description = "Category slug", example = "general-discussion") @PathVariable String slug,
            @Valid @RequestBody UpdateCategoryRequest request) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Delete a category by slug", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Category deleted"),
        @ApiResponse(responseCode = "403", description = "Admin role required"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @DeleteMapping("/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteCategory(
            @Parameter(description = "Category slug", example = "general-discussion") @PathVariable String slug) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }
}
