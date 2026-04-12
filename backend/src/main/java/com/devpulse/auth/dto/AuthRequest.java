package com.devpulse.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO запроса на вход пользователя в систему.
 *
 * <p>Используется в {@code POST /auth/login}. Оба поля обязательны.
 *
 * <p>Пример JSON-запроса:
 * <pre>
 * {
 *   "username": "ivan_petrov",
 *   "password": "Secret123!"
 * }
 * </pre>
 */
@Data
public class AuthRequest {

    /** Имя пользователя, зарегистрированное в системе. */
    @NotBlank
    private String username;

    /** Пароль в открытом виде — проверяется через BCrypt. */
    @NotBlank
    private String password;
}
