package com.devpulse.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO запроса на обновление access token.
 *
 * <p>Используется в {@code POST /auth/refresh}.
 * Клиент передаёт refresh token, полученный при входе или регистрации.
 *
 * <p>Пример JSON-запроса:
 * <pre>
 * {
 *   "refreshToken": "a1b2c3d4e5f6..."
 * }
 * </pre>
 */
@Data
public class RefreshRequest {

    /**
     * Значение refresh token — должно совпадать с токеном, сохранённым в базе данных.
     * Непустая строка; валидируется через {@link NotBlank}.
     */
    @NotBlank
    private String refreshToken;
}
