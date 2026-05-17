package com.devpulse.auth.repository;

import com.devpulse.auth.entity.RefreshToken;
import com.devpulse.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * JPA repository for the {@link RefreshToken} entity.
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /**
     * Finds a refresh token by its value.
     * Used when refreshing the access token, validating the rotation chain
     * and on logout.
     *
     * @param token the refresh token value provided by the client
     * @return an {@link Optional} containing the token, or empty if it does not exist in the database
     */
    Optional<RefreshToken> findByToken(String token);

    /**
     * Marks every active refresh token belonging to the given user as revoked.
     *
     * <p>Called when the user logs out from all sessions, changes their password
     * or when token reuse is detected — the entire token family is invalidated.
     *
     * @param user the user whose tokens should be revoked
     * @param now  the revocation timestamp to write
     * @return the number of tokens updated
     */
    @Modifying
    @Query("""
           UPDATE RefreshToken rt
              SET rt.revokedAt = :now
            WHERE rt.user = :user
              AND rt.revokedAt IS NULL
           """)
    int revokeAllActiveByUser(@Param("user") User user, @Param("now") OffsetDateTime now);
}
