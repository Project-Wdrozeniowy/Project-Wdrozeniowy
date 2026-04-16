package com.devpulse.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO for a new user registration request.
 *
 * <p>Used by {@code POST /auth/register}. All fields are required
 * and validated via Bean Validation before being passed to the service.
 *
 * <p>Example JSON request:
 * <pre>
 * {
 *   "username": "ivan_petrov",
 *   "email":    "ivan@example.com",
 *   "password": "Secret123!"
 * }
 * </pre>
 */
@Data
public class RegisterRequest {

    /**
     * Username — unique in the system, publicly visible.
     * Allowed length: 3–50 characters.
     */
    @NotBlank
    @Size(min = 3, max = 50)
    private String username;

    /**
     * Email address — unique in the system.
     * Format is validated via {@link Email}.
     */
    @NotBlank
    @Email
    @Size(max = 100)
    private String email;

    /**
     * Plain-text password — hashed with BCrypt before being stored.
     * Required length: 8–128 characters.
     */
    @NotBlank
    @Size(min = 8, max = 128)
    private String password;
}
