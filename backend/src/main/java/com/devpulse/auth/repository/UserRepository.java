package com.devpulse.auth.repository;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /**
     * Atomically adds {@code delta} to the user's post counter. A bulk update,
     * so concurrent posts by the same user don't overwrite each other's count.
     *
     * @param userId the author
     * @param delta  {@code +1} or {@code -1}
     * @return the number of updated rows
     */
    @Modifying
    @Query("UPDATE User u SET u.postCount = u.postCount + :delta WHERE u.id = :userId")
    int adjustPostCount(@Param("userId") Long userId, @Param("delta") int delta);

    /**
     * Users with {@code status} whose username or display name matches
     * {@code pattern}, a lower-case {@code LIKE} pattern from
     * {@link com.devpulse.common.util.LikePatterns#containing}.
     */
    @Query("SELECT u FROM User u WHERE u.status = :status "
            + "AND (LOWER(u.username) LIKE :pattern ESCAPE '\\' OR LOWER(u.displayName) LIKE :pattern ESCAPE '\\')")
    Page<User> searchByStatus(@Param("pattern") String pattern, @Param("status") UserStatus status,
                              Pageable pageable);
}
