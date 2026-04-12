package com.devpulse.auth.dto;

import lombok.Builder;
import lombok.Data;

/**
 * DTO ответа, возвращаемого после успешной аутентификации.
 *
 * <p>Возвращается из {@code POST /auth/register}, {@code POST /auth/login}
 * и {@code POST /auth/refresh}.
 *
 * <p>Пример JSON-ответа:
 * <pre>
 * {
 *   "accessToken":  "eyJhbGciOiJIUzI1NiJ9...",
 *   "refreshToken": "a1b2c3d4e5f6...",
 *   "tokenType":    "Bearer",
 *   "expiresIn":    900
 * }
 * </pre>
 */
@Data
@Builder
public class AuthResponse {

    /**
     * Подписанный JWT для аутентификации запросов.
     * Передаётся в заголовке {@code Authorization: Bearer <accessToken>}.
     */
    private String accessToken;

    /**
     * Непрозрачный токен для обновления access token.
     * Передаётся в {@code POST /auth/refresh} после истечения access token.
     */
    private String refreshToken;

    /**
     * Тип токена согласно спецификации OAuth 2.0.
     * Всегда {@code "Bearer"}.
     */
    @Builder.Default
    private String tokenType = "Bearer";

    /**
     * Время жизни access token в секундах с момента выпуска.
     * По умолчанию 900 с (15 минут).
     */
    private long expiresIn;
}
