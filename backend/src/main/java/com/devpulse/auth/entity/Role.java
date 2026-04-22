package com.devpulse.auth.entity;

/**
 * User roles in the DevPulse system.
 *
 * <p>Values are stored as strings in the {@code users.role} column
 * and mapped to Spring Security authorities as {@code "ROLE_USER"} / {@code "ROLE_ADMIN"}.
 *
 * <p>Roles are assigned at registration — default is {@link #USER}.
 * Changing a role to {@link #ADMIN} requires administrative action.
 */
public enum Role {

    /** Standard user — can create posts, comments, and vote. */
    USER,

    /** Administrator — full access, content moderation, user management. */
    ADMIN
}
