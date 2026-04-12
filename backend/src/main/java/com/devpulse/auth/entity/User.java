package com.devpulse.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

/**
 * Сущность, представляющая учётную запись пользователя в системе Orbit.
 *
 * <p>Маппится на таблицу {@code users} в PostgreSQL.
 * Пароль хранится исключительно в хэшированном виде (BCrypt)
 * в колонке {@code password_hash}.
 *
 * <p>Роль пользователя ({@link Role}) определяет его права в системе:
 * <ul>
 *   <li>{@code USER}  — стандартные права (создание постов, комментариев, голосование)</li>
 *   <li>{@code ADMIN} — полный доступ, включая модерацию контента</li>
 * </ul>
 */
@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    /** Первичный ключ, генерируемый последовательностью PostgreSQL (BIGSERIAL). */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Уникальное имя пользователя, публично видимое (макс. 50 символов). */
    @Column(nullable = false, unique = true, length = 50)
    private String username;

    /** Адрес электронной почты — используется для восстановления аккаунта (макс. 100 символов). */
    @Column(nullable = false, unique = true, length = 100)
    private String email;

    /**
     * BCrypt-хэш пароля.
     * Никогда не передаётся клиенту.
     */
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    /**
     * Роль пользователя, определяющая его права.
     * Значение по умолчанию: {@link Role#USER}.
     * Хранится как PostgreSQL enum-тип {@code user_role}.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "user_role")
    @Builder.Default
    private Role role = Role.USER;

    /** Временная метка создания аккаунта — устанавливается автоматически, неизменна. */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /** Временная метка последнего изменения записи — обновляется автоматически. */
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
