package com.devpulse.auth.service;

import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.entity.RefreshToken;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.RefreshTokenRepository;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.exception.AppException;
import com.devpulse.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Service responsible for user registration, login, JWT token refresh and logout.
 *
 * <p>Authentication flow:
 * <pre>
 * Registration:  RegisterRequest -> uniqueness check -> BCrypt hash -> save User -> tokens
 * Login:         AuthRequest     -> AuthenticationManager -> revoke previous tokens -> tokens
 * Refresh:       refresh token   -> active check -> rotate (revoke old, issue new) -> tokens
 * Logout:        refresh token   -> mark revoked (idempotent)
 * </pre>
 *
 * <p>Refresh tokens are rotated on every successful refresh. If a token that
 * has already been revoked but is not yet expired is presented, the whole
 * token family for that user is revoked — this is a textbook refresh-token
 * reuse detection that catches stolen tokens.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /** Used to verify the password during login. */
    private final AuthenticationManager authenticationManager;

    /** Used to load UserDetails when generating a token. */
    private final UserDetailsService userDetailsService;

    /** Access token lifetime in seconds; default 900 s = 15 minutes. */
    @Value("${jwt.access-expiry:900}")
    private long accessExpirySeconds;

    /** Refresh token lifetime in seconds; default 604800 s = 7 days. */
    @Value("${jwt.refresh-expiry:604800}")
    private long refreshExpirySeconds;

    /**
     * Registers a new user and returns a token pair.
     *
     * @param request registration data (username, email, password)
     * @return {@link AuthResponse} containing access and refresh tokens
     * @throws AppException HTTP 409 if the username or email is already taken
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException("Username already taken", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException("Email already registered", HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    /**
     * Logs in a user and returns a token pair.
     *
     * <p>Before generating new tokens, all previously active refresh tokens
     * for the user are revoked (single active session strategy).
     *
     * @param request login credentials (username, password)
     * @return {@link AuthResponse} containing access and refresh tokens
     * @throws org.springframework.security.core.AuthenticationException if the credentials are invalid
     */
    @Transactional
    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        refreshTokenRepository.revokeAllActiveByUser(user, OffsetDateTime.now());

        return buildAuthResponse(user);
    }

    /**
     * Refreshes the access token using a valid refresh token, rotating the
     * refresh token in the process.
     *
     * <p>On success the presented refresh token is revoked and a brand new
     * refresh token is issued together with a new access token. If the
     * presented token has already been revoked but is not yet expired, all
     * active tokens for that user are revoked — this catches replay of a
     * stolen token.
     *
     * @param rawRefreshToken the refresh token value from the client request
     * @return {@link AuthResponse} with new access and refresh tokens
     * @throws AppException HTTP 401 if the token is unknown, expired or revoked
     */
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken stored = refreshTokenRepository.findByToken(rawRefreshToken)
                .orElseThrow(() -> new AppException("Refresh token not found", HttpStatus.UNAUTHORIZED));

        if (stored.isExpired()) {
            throw new AppException("Refresh token expired", HttpStatus.UNAUTHORIZED);
        }

        if (stored.isRevoked()) {
            // Reuse detected — a token that was already rotated is being presented again.
            // Burn the entire token family to invalidate the attacker (and the legitimate
            // user, who will be forced to log in again).
            log.warn("Refresh token reuse detected for user id={}", stored.getUser().getId());
            refreshTokenRepository.revokeAllActiveByUser(stored.getUser(), OffsetDateTime.now());
            throw new AppException("Refresh token revoked", HttpStatus.UNAUTHORIZED);
        }

        // Rotate: revoke the presented token and issue a fresh pair.
        stored.setRevokedAt(OffsetDateTime.now());
        refreshTokenRepository.save(stored);

        return buildAuthResponse(stored.getUser());
    }

    /**
     * Revokes the given refresh token.
     *
     * <p>Idempotent — unknown or already-revoked tokens are silently ignored
     * so that the endpoint never discloses token state to the client.
     *
     * @param rawRefreshToken the refresh token value to revoke
     */
    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenRepository.findByToken(rawRefreshToken).ifPresent(token -> {
            if (!token.isRevoked()) {
                token.setRevokedAt(OffsetDateTime.now());
                refreshTokenRepository.save(token);
            }
        });
    }

    /**
     * Helper method that creates a new token pair (access + refresh) for a user
     * and saves the refresh token to the database.
     *
     * @param user the user entity
     * @return {@link AuthResponse} ready to be sent to the client
     */
    private AuthResponse buildAuthResponse(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String accessToken = jwtUtil.generateAccessToken(userDetails);
        String rawRefresh = jwtUtil.generateRefreshToken();

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(rawRefresh)
                .expiresAt(OffsetDateTime.now().plusSeconds(refreshExpirySeconds))
                .build());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefresh)
                .expiresIn(accessExpirySeconds)
                .build();
    }
}
