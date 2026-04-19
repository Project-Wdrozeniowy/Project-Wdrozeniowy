package com.devpulse.auth.repository;

import com.devpulse.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * JPA repository for the {@link User} entity.
 *
 * <p>Spring Data JPA automatically implements methods based on their names
 * (query derivation) — no SQL or JPQL needs to be written manually.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds a user by username.
     * Used in {@link com.devpulse.auth.service.UserDetailsServiceImpl}
     * and {@link com.devpulse.auth.service.AuthService}.
     *
     * @param username the username to look up
     * @return an {@link Optional} containing the user, or empty if not found
     */
    Optional<User> findByUsername(String username);

    /**
     * Checks whether a username is already taken.
     * Used during registration validation before saving to the database.
     *
     * @param username the username to check
     * @return {@code true} if a user with that username already exists
     */
    boolean existsByUsername(String username);

    /**
     * Checks whether an email address is already registered.
     * Used during registration validation before saving to the database.
     *
     * @param email the email address to check
     * @return {@code true} if an account with that email already exists
     */
    boolean existsByEmail(String email);
}
