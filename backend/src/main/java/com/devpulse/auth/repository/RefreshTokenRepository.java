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
     * "Active" means not yet revoked and not yet expired — expired tokens are
     * left untouched so their original lifecycle stays visible in the audit log.
     *
     * <p>Called when the user logs out from all sessions, changes their password
     * or when token reuse is detected — the entire token family is invalidated.
     *
     * @param user the user whose tokens should be revoked
     * @param now  the revocation timestamp to write (also used as the expiry cutoff)
     * @return the number of tokens updated
     */
    @Modifying
    @Query("""
           UPDATE RefreshToken rt
              SET rt.revokedAt = :now
            WHERE rt.user = :user
              AND rt.revokedAt IS NULL
              AND rt.expiresAt > :now
           """)
    int revokeAllActiveByUser(@Param("user") User user, @Param("now") OffsetDateTime now);

    /**
     * Atomically revokes a single refresh token if and only if it is still
     * active (not revoked and not expired). Returning the number of affected
     * rows lets callers detect lost races: when two concurrent {@code /auth/refresh}
     * requests carry the same token, only one UPDATE will hit a row, and the
     * other receives 0. The loser can then look up the {@code replacedBy}
     * pointer set by {@link #linkReplacedBy} to see whether this was a benign
     * rotation race or genuine token reuse.
     *
     * @param token the refresh token value to revoke
     * @param now   the revocation timestamp to write (also the expiry cutoff)
     * @return 1 if the token was revoked by this call, 0 otherwise
     */
    @Modifying
    @Query("""
           UPDATE RefreshToken rt
              SET rt.revokedAt = :now
            WHERE rt.token = :token
              AND rt.revokedAt IS NULL
              AND rt.expiresAt > :now
           """)
    int revokeIfActive(@Param("token") String token, @Param("now") OffsetDateTime now);

    /**
     * Records the token that replaced a just-rotated one.
     *
     * <p>Called only on the winning side of a refresh rotation, right after
     * {@link #revokeIfActive} succeeds for the same row. This is a separate
     * bulk update — rather than mutating and saving the loaded entity —
     * because bulk updates bypass the persistence context: saving the
     * in-memory entity afterwards would overwrite the {@code revokedAt} that
     * {@link #revokeIfActive} just wrote in the database with its stale
     * (still-null) in-memory value.
     *
     * @param tokenId    the id of the just-revoked token
     * @param replacedBy the newly issued token that replaced it
     * @return the number of rows updated (0 or 1)
     */
    @Modifying
    @Query("""
           UPDATE RefreshToken rt
              SET rt.replacedBy = :replacedBy
            WHERE rt.id = :tokenId
           """)
    int linkReplacedBy(@Param("tokenId") Long tokenId, @Param("replacedBy") RefreshToken replacedBy);
}
