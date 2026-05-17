package com.devpulse.auth.entity;

/**
 * Lifecycle status of a user account, mirroring the PostgreSQL
 * {@code user_status} enum defined in migration V1.
 *
 * <p>Used to block sign-in and write actions for banned or deactivated
 * accounts without losing the historical record.
 */
public enum UserStatus {

    /** Default — account is fully usable. */
    ACTIVE,

    /** Account is banned by a moderator/admin; sign-in is rejected. */
    BANNED,

    /** Account was voluntarily deactivated by its owner. */
    DEACTIVATED
}
