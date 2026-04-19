package com.devpulse.auth.repository;

import com.devpulse.auth.entity.RefreshToken;
import com.devpulse.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

/**
 * JPA repository for the {@link RefreshToken} entity.
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /**
     * Finds a refresh token by its value.
     * Used when refreshing the access token and checking token expiry.
     *
     * @param token the refresh token value provided by the client
     * @return an {@link Optional} containing the token, or empty if it does not exist in the database
     */
    Optional<RefreshToken> findByToken(String token);

    /**
     * Deletes all refresh tokens belonging to the specified user.
     *
     * <p>Called on every login to prevent token accumulation in the database
     * and to ensure only the most recent token is active.
     * The {@link Modifying} annotation is required for data-modifying queries.
     *
     * @param user the user whose tokens should be deleted
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.user = :user")
    void deleteAllByUser(User user);
}
