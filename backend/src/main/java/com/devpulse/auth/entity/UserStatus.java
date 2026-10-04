package com.devpulse.auth.entity;

/**
 * Lifecycle status of a user account, mirroring the PostgreSQL
 * {@code user_status} enum defined in migration V1.
 *
 * <p>The status is persisted so banned or deactivated accounts can be kept
 * without losing their history. It is exposed on the caller's own profile
 * but is not yet enforced at sign-in or on write actions.
 */
public enum UserStatus {

    /** Default — account is fully usable. */
    ACTIVE,

    /** Account was banned by a moderator or admin. */
    BANNED,

    /** Account was voluntarily deactivated by its owner. */
    DEACTIVATED
}
