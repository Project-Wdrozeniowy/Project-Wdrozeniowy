package com.devpulse.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO запроса на регистрацию нового аккаунта пользователя.
 *
 * <p>Используется в {@code POST /auth/register}. Все поля обязательны
 * и валидируются через Bean Validation перед передачей в сервис.
 *
 * <p>Пример JSON-запроса:
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
     * Имя пользователя — уникальное в системе, публично видимое.
     * Допустимая длина: 3–50 символов.
     */
    @NotBlank
    @Size(min = 3, max = 50)
    private String username;

    /**
     * Адрес электронной почты — уникальный в системе.
     * Проверяется на корректность формата через {@link Email}.
     */
    @NotBlank
    @Email
    @Size(max = 100)
    private String email;

    /**
     * Пароль в открытом виде — хэшируется BCrypt перед сохранением в базу.
     * Требуемая длина: 8–128 символов.
     */
    @NotBlank
    @Size(min = 8, max = 128)
    private String password;
}
