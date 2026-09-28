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
 * <p>Refresh tokens are rotated on every successful refresh, and the old
 * token is left pointing (via {@code replacedBy}) at the new one. If an
 * already-revoked token is presented again, that pointer tells us whether
 * this is a benign concurrent refresh (two requests racing for the same
 * not-yet-rotated token — the loser simply gets the same new pair the
 * winner already received) or genuine reuse of an old, already-superseded
 * token, in which case the whole token family for that user is revoked —
 * a textbook refresh-token reuse detection that catches stolen tokens.
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
     * Generic message returned to the client for every refresh failure
     * (unknown, expired or revoked token). Keeping this message identical
     * across all three cases prevents an unauthenticated caller from
     * distinguishing why a refresh token was rejected; the specific reason
     * is still recorded in the server logs for observability.
     */
    private static final String INVALID_REFRESH_TOKEN_MESSAGE = "Invalid refresh token";

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
     * <p>On success the presented refresh token is revoked, a brand new
     * refresh token is issued together with a new access token, and the old
     * token is left pointing at the new one via {@code replacedBy}.
     *
     * <p>If the presented token is already revoked, the {@code replacedBy}
     * pointer decides what happens next:
     * <ul>
     *   <li>if it points at a still-active token, this is a benign
     *   concurrent refresh (two requests racing for the same not-yet-rotated
     *   token) — the caller gets the same new pair the winner already got</li>
     *   <li>otherwise, an old, already-superseded token is being replayed —
     *   real reuse — so every active token for that user is revoked</li>
     * </ul>
     *
     * @param rawRefreshToken the refresh token value from the client request
     * @return {@link AuthResponse} with new access and refresh tokens
     * @throws AppException HTTP 401 if the token is unknown, expired or revoked
     */
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken stored = refreshTokenRepository.findByToken(rawRefreshToken)
                .orElseThrow(() -> {
                    log.warn("Refresh attempted with a refresh token that does not exist");
                    return new AppException(INVALID_REFRESH_TOKEN_MESSAGE, HttpStatus.UNAUTHORIZED);
                });

        // Revoked is checked before expired: a token can be both revoked
        // (via rotation or reuse detection) and naturally expired, and it
        // must still go through the revoked-token handling below rather than
        // short-circuiting on a plain "expired" 401.
        if (stored.isRevoked()) {
            return handleRevokedToken(stored);
        }

        if (stored.isExpired()) {
            log.warn("Refresh token expired for user id={}", stored.getUser().getId());
            throw new AppException(INVALID_REFRESH_TOKEN_MESSAGE, HttpStatus.UNAUTHORIZED);
        }

        // stored.isActive() holds at this point (not revoked, not expired).
        // Atomically rotate: a conditional UPDATE ensures only one of any
        // concurrent refresh attempts for the same not-yet-rotated token wins.
        OffsetDateTime now = OffsetDateTime.now();
        int rotated = refreshTokenRepository.revokeIfActive(rawRefreshToken, now);
        if (rotated == 0) {
            // Someone else revoked this exact token between our checks above
            // and the atomic update. Re-fetch it — it is now revoked — and
            // let the same replacedBy logic decide whether this was a benign
            // race or real reuse.
            RefreshToken raced = refreshTokenRepository.findByToken(rawRefreshToken)
                    .orElseThrow(() -> new AppException(INVALID_REFRESH_TOKEN_MESSAGE, HttpStatus.UNAUTHORIZED));
            if (raced.isRevoked()) {
                return handleRevokedToken(raced);
            }
            // Not revoked — it must have simply expired in the tiny window
            // since our check above, rather than lost a rotation race.
            log.warn("Refresh token expired for user id={} during rotation attempt",
                    raced.getUser().getId());
            throw new AppException(INVALID_REFRESH_TOKEN_MESSAGE, HttpStatus.UNAUTHORIZED);
        }

        RefreshToken newToken = createAndSaveRefreshToken(stored.getUser());
        refreshTokenRepository.linkReplacedBy(stored.getId(), newToken);

        return buildAuthResponseFor(stored.getUser(), newToken);
    }

    /**
     * Decides what to do with a refresh token that is already revoked,
     * whether that was discovered on the initial lookup or after losing the
     * atomic rotation race.
     *
     * <p>A non-null {@code replacedBy} pointer to a still-active token means
     * another concurrent request already rotated this exact token moments
     * ago — a benign race, not reuse — so the caller is handed the same new
     * pair the winner received. Otherwise (no replacement, or the
     * replacement has itself since been revoked, meaning the chain has moved
     * on) this is a genuinely old token being replayed, so the entire token
     * family is revoked.
     *
     * @param revoked the revoked refresh token that was presented
     * @return {@link AuthResponse} derived from the replacement token, for the benign-race case
     * @throws AppException HTTP 401 if this is real token reuse
     */
    private AuthResponse handleRevokedToken(RefreshToken revoked) {
        RefreshToken replacement = revoked.getReplacedBy();
        if (replacement != null && replacement.isActive()) {
            log.info("Benign concurrent refresh for user id={}, returning already-rotated pair",
                    revoked.getUser().getId());
            return buildAuthResponseFor(revoked.getUser(), replacement);
        }

        // Reuse detected — a token that was already rotated (and whose
        // replacement has moved on, or has none) is being presented again.
        // Burn the entire token family to invalidate the attacker (and the
        // legitimate user, who will be forced to log in again).
        log.warn("Refresh token reuse detected for user id={}", revoked.getUser().getId());
        refreshTokenRepository.revokeAllActiveByUser(revoked.getUser(), OffsetDateTime.now());
        throw new AppException(INVALID_REFRESH_TOKEN_MESSAGE, HttpStatus.UNAUTHORIZED);
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
        return buildAuthResponseFor(user, createAndSaveRefreshToken(user));
    }

    /**
     * Builds the token pair returned to the client for a given user, reusing
     * an already-created (and already-saved) refresh token entity rather than
     * minting a new one.
     *
     * <p>Used both for the normal rotation path (the refresh token was just
     * created) and for the benign-race path (the refresh token is the one a
     * concurrent winning request already created).
     *
     * @param user             the user entity
     * @param refreshTokenEntity the refresh token whose raw value is sent to the client
     * @return {@link AuthResponse} ready to be sent to the client
     */
    private AuthResponse buildAuthResponseFor(User user, RefreshToken refreshTokenEntity) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String accessToken = jwtUtil.generateAccessToken(userDetails);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenEntity.getToken())
                .expiresIn(accessExpirySeconds)
                .build();
    }

    /**
     * Creates a new refresh token entity for the given user and persists it.
     *
     * @param user the user the token belongs to
     * @return the newly created refresh token, with its raw value already set
     */
    private RefreshToken createAndSaveRefreshToken(User user) {
        RefreshToken newToken = RefreshToken.builder()
                .user(user)
                .token(jwtUtil.generateRefreshToken())
                .expiresAt(OffsetDateTime.now().plusSeconds(refreshExpirySeconds))
                .build();
        refreshTokenRepository.save(newToken);
        return newToken;
    }
}
