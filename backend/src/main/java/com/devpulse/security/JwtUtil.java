package com.devpulse.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

/**
 * Утилита для работы с JWT-токенами.
 *
 * <p>Поддерживает два типа токенов:
 * <ul>
 *   <li><b>Access token</b> — подписанный JWT со временем жизни (по умолчанию 15 минут).
 *       Передаётся в заголовке {@code Authorization: Bearer <token>}.</li>
 *   <li><b>Refresh token</b> — случайная строка (UUID × 2), хранится в базе данных.
 *       Используется для получения нового access token без повторного входа.</li>
 * </ul>
 *
 * <p>Ключ подписи (HMAC-SHA) считывается из переменной {@code jwt.secret}
 * в виде строки, закодированной в Base64.
 */
@Slf4j
@Component
public class JwtUtil {

    /** Криптографический ключ HMAC-SHA для подписи и верификации токенов. */
    private final SecretKey key;

    /** Время жизни access token в секундах (по умолчанию 900 с = 15 минут). */
    private final long accessExpirySeconds;

    /**
     * Конструктор, считывающий конфигурацию из application.properties.
     *
     * @param secret            секрет JWT, закодированный в Base64 (минимум 32 байта)
     * @param accessExpirySeconds время жизни access token в секундах
     */
    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-expiry:900}") long accessExpirySeconds) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.accessExpirySeconds = accessExpirySeconds;
    }

    /**
     * Генерирует подписанный JWT (access token) для указанного пользователя.
     *
     * <p>Токен содержит: {@code sub} (имя пользователя), {@code iat} (время выпуска),
     * {@code exp} (время истечения).
     *
     * @param userDetails данные пользователя из Spring Security
     * @return компактный подписанный JWT в виде строки
     */
    public String generateAccessToken(UserDetails userDetails) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .issuedAt(new Date(now))
                .expiration(new Date(now + accessExpirySeconds * 1_000))
                .signWith(key)
                .compact();
    }

    /**
     * Генерирует случайный refresh token в виде непрозрачной строки (64 hex-символа).
     *
     * <p>Токен не содержит данных пользователя — его валидность проверяется
     * исключительно через поиск в базе данных.
     *
     * @return случайная строка из двух UUID без дефисов
     */
    public String generateRefreshToken() {
        return UUID.randomUUID().toString().replace("-", "")
             + UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * Извлекает имя пользователя (claim {@code sub}) из JWT.
     *
     * @param token подписанный JWT
     * @return имя пользователя
     * @throws io.jsonwebtoken.JwtException если токен некорректен или истёк
     */
    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * Проверяет, действителен ли токен для указанного пользователя.
     *
     * <p>Токен считается действительным, если:
     * <ol>
     *   <li>Подпись корректна (проверяется через {@link #parseClaims}).</li>
     *   <li>Имя пользователя в токене совпадает с {@code userDetails.getUsername()}.</li>
     *   <li>Токен не истёк.</li>
     * </ol>
     *
     * @param token       JWT для проверки
     * @param userDetails данные пользователя, загруженные из базы
     * @return {@code true} если токен действителен, {@code false} в противном случае
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            String username = extractUsername(token);
            return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Недействительный JWT: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Проверяет, истекло ли время жизни токена.
     *
     * @param token JWT для проверки
     * @return {@code true} если токен истёк
     */
    private boolean isTokenExpired(String token) {
        return parseClaims(token).getExpiration().before(new Date());
    }

    /**
     * Парсит и верифицирует подпись токена, возвращая его claims (payload).
     *
     * @param token подписанный JWT
     * @return декодированный payload ({@link Claims})
     * @throws io.jsonwebtoken.JwtException если подпись некорректна
     */
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
