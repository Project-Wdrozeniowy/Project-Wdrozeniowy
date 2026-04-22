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
 * Service responsible for user registration, login, and JWT token refresh.
 *
 * <p>Authentication flow:
 * <pre>
 * Registration:  RegisterRequest → uniqueness check → BCrypt hash → save User → tokens
 * Login:         AuthRequest → AuthenticationManager → invalidate old refresh tokens → tokens
 * Refresh:       refresh token → look up in DB → check expiry → new access token
 * </pre>
 */
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
     * <p>Before generating new tokens, all previous refresh tokens for the user
     * are invalidated (single active refresh token strategy).
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

        refreshTokenRepository.deleteAllByUser(user);

        return buildAuthResponse(user);
    }

    /**
     * Refreshes the access token using a valid refresh token.
     *
     * <p>The refresh token remains unchanged — it is not rotated on refresh.
     * An expired refresh token is deleted from the database.
     *
     * @param rawRefreshToken the refresh token value from the client request
     * @return {@link AuthResponse} with a new access token and the same refresh token
     * @throws AppException HTTP 401 if the token is not found or has expired
     */
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken stored = refreshTokenRepository.findByToken(rawRefreshToken)
                .orElseThrow(() -> new AppException("Refresh token not found", HttpStatus.UNAUTHORIZED));

        if (stored.isExpired()) {
            refreshTokenRepository.delete(stored);
            throw new AppException("Refresh token expired", HttpStatus.UNAUTHORIZED);
        }

        User user = stored.getUser();
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String newAccessToken = jwtUtil.generateAccessToken(userDetails);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(rawRefreshToken)
                .expiresIn(accessExpirySeconds)
                .build();
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
