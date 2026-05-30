package com.devpulse.auth.entity;

/**
 * User roles in the Orbita Forum system.
 *
 * <p>Values are stored as strings in the {@code users.role} column
 * (PostgreSQL {@code user_role} enum) and mapped to Spring Security authorities
 * as {@code "ROLE_USER"}, {@code "ROLE_MODERATOR"}, {@code "ROLE_ADMIN"}.
 *
 * <p>Role hierarchy (informational; enforced explicitly via {@code @PreAuthorize}):
 * <pre>
 *   USER       — baseline; can create posts, comments and vote.
 *   MODERATOR  — USER permissions + content moderation (hide, lock, edit any post/comment).
 *   ADMIN      — MODERATOR permissions + user management and system configuration.
 * </pre>
 *
 * <p>Roles are assigned at registration — default is {@link #USER}.
 * Elevation to {@link #MODERATOR} or {@link #ADMIN} requires an administrative action.
 */
public enum Role {

    /** Standard user — can create posts, comments, and vote. */
    USER,

    /** Moderator — content moderation across the forum (hide/lock posts and comments). */
    MODERATOR,

    /** Administrator — full access, including user management and configuration. */
    ADMIN
}
