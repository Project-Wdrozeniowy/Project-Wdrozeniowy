package com.devpulse.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

/**
 * Сущность refresh token, хранящегося в базе данных.
 *
 * <p>Refresh token — непрозрачная строка (UUID × 2), позволяющая клиенту
 * получить новый access token без повторного входа.
 * Хранение в БД позволяет аннулировать токен на стороне сервера.
 *
 * <p>Маппится на таблицу {@code refresh_tokens} в PostgreSQL.
 * Связан с {@link User} отношением многие-к-одному (у одного пользователя
 * может быть несколько refresh токенов, но при каждом входе предыдущие аннулируются).
 */
@Entity
@Table(name = "refresh_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    /** Первичный ключ, генерируемый последовательностью PostgreSQL (BIGSERIAL). */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Пользователь, которому принадлежит этот refresh token.
     * Загружается лениво — только когда требуется.
     * При удалении пользователя все его токены удаляются каскадно.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Значение токена — случайная строка из 64 hex-символов (2 × UUID без дефисов).
     * Уникальна в рамках всей таблицы; индексируется для быстрого поиска.
     */
    @Column(nullable = false, unique = true, length = 512)
    private String token;

    /** Время истечения токена (по умолчанию: 7 дней с момента выпуска). */
    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    /** Временная метка выпуска токена — устанавливается автоматически, неизменна. */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /**
     * Проверяет, истёк ли срок действия токена.
     *
     * @return {@code true} если текущее время позже {@link #expiresAt}
     */
    public boolean isExpired() {
        return OffsetDateTime.now().isAfter(expiresAt);
    }
}
