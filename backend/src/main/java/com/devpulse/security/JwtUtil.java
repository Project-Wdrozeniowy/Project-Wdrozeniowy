package com.devpulse.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

/**
 * Utility class for working with JWT tokens.
 *
 * <p>Supports two token types:
 * <ul>
 *   <li><b>Access token</b> — a signed JWT with a configurable lifetime (default 15 minutes).
 *       Sent in the {@code Authorization: Bearer <token>} header.</li>
 *   <li><b>Refresh token</b> — a random opaque string (UUID x 2) stored in the database.
 *       Used to obtain a new access token without logging in again.</li>
 * </ul>
 *
 * <p>The signing key (HMAC-SHA) is read from the {@code jwt.secret} property
 * as a Base64-encoded string.
 */
@Slf4j
@Component
public class JwtUtil {

    /** HMAC-SHA cryptographic key used to sign and verify tokens. */
    private final SecretKey key;

    /** Access token lifetime in seconds (default 900 s = 15 minutes). */
    private final long accessExpirySeconds;

    /**
     * Constructor that reads configuration from application.properties.
     *
     * @param secret            the JWT secret encoded in Base64 (minimum 32 bytes)
     * @param accessExpirySeconds access token lifetime in seconds
     */
    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-expiry:900}") long accessExpirySeconds) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.accessExpirySeconds = accessExpirySeconds;
    }

    /**
     * Generates a signed JWT (access token) for the specified user.
     *
     * <p>The token contains: {@code sub} (username), {@code iat} (issued at),
     * {@code exp} (expiration time).
     *
     * @param userDetails user data from Spring Security
     * @return a compact signed JWT string
     */
    public String generateAccessToken(UserDetails userDetails) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .issuedAt(new Date(now))
                .expiration(new Date(now + accessExpirySeconds * 1_000))
                .signWith(key)
                .compact();
    }

    /**
     * Generates a random refresh token as an opaque string (64 hex characters).
     *
     * <p>The token contains no user data — its validity is verified
     * exclusively by looking it up in the database.
     *
     * @return a random string composed of two UUIDs without hyphens
     */
    public String generateRefreshToken() {
        return UUID.randomUUID().toString().replace("-", "")
             + UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * Extracts the username (the {@code sub} claim) from a JWT.
     *
     * @param token a signed JWT
     * @return the username
     * @throws io.jsonwebtoken.JwtException if the token is invalid or expired
     */
    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * Checks whether a token is valid for the specified user.
     *
     * <p>A token is considered valid if:
     * <ol>
     *   <li>The signature is correct (verified via {@link #parseClaims}).</li>
     *   <li>The username in the token matches {@code userDetails.getUsername()}.</li>
     *   <li>The token has not expired.</li>
     * </ol>
     *
     * @param token       the JWT to verify
     * @param userDetails user data loaded from the database
     * @return {@code true} if the token is valid, {@code false} otherwise
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            String username = extractUsername(token);
            return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Invalid JWT: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Checks whether the token's lifetime has expired.
     *
     * @param token the JWT to check
     * @return {@code true} if the token has expired
     */
    private boolean isTokenExpired(String token) {
        return parseClaims(token).getExpiration().before(new Date());
    }

    /**
     * Parses and verifies the token's signature, returning its claims (payload).
     *
     * @param token a signed JWT
     * @return the decoded payload ({@link Claims})
     * @throws io.jsonwebtoken.JwtException if the signature is invalid
     */
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
