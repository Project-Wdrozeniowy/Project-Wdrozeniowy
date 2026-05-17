package com.devpulse.auth.service;

import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.dto.UserInfo;
import com.devpulse.auth.entity.RefreshToken;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.RefreshTokenRepository;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.exception.AppException;
import com.devpulse.security.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
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
 * Service responsible for user registration, login, token refresh, and logout.
 *
 * <p>The refresh token is delivered as an {@code HttpOnly} cookie and is never
 * exposed in the JSON response body, eliminating the XSS attack vector of
 * storing it in {@code localStorage}.
 *
 * <p>Authentication flow:
 * <pre>
 * Registration:  RegisterRequest → uniqueness check → BCrypt hash → save User
 *                → issue access token + set refresh cookie
 * Login:         AuthRequest → AuthenticationManager → revoke old refresh tokens
 *                → issue access token + set refresh cookie
 * Refresh:       read refresh cookie → validate in DB → issue new access token
 *                → rotate refresh cookie
 * Me:            read refresh cookie → validate in DB → return user + new access token
 * Logout:        read refresh cookie → delete from DB → clear cookie
 * </pre>
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    public static final String REFRESH_COOKIE_NAME = "refreshToken";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    @Value("${jwt.access-expiry:900}")
    private long accessExpirySeconds;

    @Value("${jwt.refresh-expiry:604800}")
    private long refreshExpirySeconds;

    /** When {@code true} the cookie is marked {@code Secure} (HTTPS only). */
    @Value("${app.secure-cookie:true}")
    private boolean secureCookie;

    /**
     * Registers a new user and starts their session.
     *
     * @throws AppException HTTP 409 if username or email is already taken
     */
    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
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

        return buildAuthResponse(user, response);
    }

    /**
     * Logs in a user, revokes all previous refresh tokens, and starts a new session.
     *
     * @throws org.springframework.security.core.AuthenticationException on bad credentials
     */
    @Transactional
    public AuthResponse login(AuthRequest request, HttpServletResponse response) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        refreshTokenRepository.deleteAllByUser(user);

        return buildAuthResponse(user, response);
    }

    /**
     * Exchanges a valid refresh token (from the cookie) for a new access token.
     * The refresh token is rotated — a new cookie is set on every call.
     *
     * @param rawRefreshToken value read from the {@code refreshToken} cookie
     * @throws AppException HTTP 401 if the token is not found or has expired
     */
    @Transactional
    public AuthResponse refresh(String rawRefreshToken, HttpServletResponse response) {
        if (rawRefreshToken == null) {
            throw new AppException("Refresh token not found", HttpStatus.UNAUTHORIZED);
        }

        RefreshToken stored = refreshTokenRepository.findByToken(rawRefreshToken)
                .orElseThrow(() -> new AppException("Refresh token not found", HttpStatus.UNAUTHORIZED));

        if (stored.isExpired()) {
            refreshTokenRepository.delete(stored);
            clearRefreshCookie(response);
            throw new AppException("Refresh token expired", HttpStatus.UNAUTHORIZED);
        }

        User user = stored.getUser();

        // Rotate: delete old token and issue a new one
        refreshTokenRepository.delete(stored);

        return buildAuthResponse(user, response);
    }

    /**
     * Restores a session using the refresh token cookie.
     * Returns the authenticated user and a fresh access token.
     *
     * @param rawRefreshToken value read from the {@code refreshToken} cookie
     * @throws AppException HTTP 401 if the cookie is missing or the token is invalid/expired
     */
    @Transactional
    public AuthResponse me(String rawRefreshToken, HttpServletResponse response) {
        if (rawRefreshToken == null) {
            throw new AppException("No session found", HttpStatus.UNAUTHORIZED);
        }

        RefreshToken stored = refreshTokenRepository.findByToken(rawRefreshToken)
                .orElseThrow(() -> new AppException("Session not found", HttpStatus.UNAUTHORIZED));

        if (stored.isExpired()) {
            refreshTokenRepository.delete(stored);
            clearRefreshCookie(response);
            throw new AppException("Session expired", HttpStatus.UNAUTHORIZED);
        }

        User user = stored.getUser();
        refreshTokenRepository.delete(stored);

        return buildAuthResponse(user, response);
    }

    /**
     * Logs out the user by deleting the refresh token and clearing the cookie.
     *
     * @param rawRefreshToken value read from the {@code refreshToken} cookie (may be {@code null})
     */
    @Transactional
    public void logout(String rawRefreshToken, HttpServletResponse response) {
        if (rawRefreshToken != null) {
            refreshTokenRepository.findByToken(rawRefreshToken)
                    .ifPresent(refreshTokenRepository::delete);
        }
        clearRefreshCookie(response);
    }

    // ─── helpers ─────────────────────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(User user, HttpServletResponse response) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String accessToken = jwtUtil.generateAccessToken(userDetails);
        String rawRefresh = jwtUtil.generateRefreshToken();

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(rawRefresh)
                .expiresAt(OffsetDateTime.now().plusSeconds(refreshExpirySeconds))
                .build());

        setRefreshCookie(response, rawRefresh);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .expiresIn(accessExpirySeconds)
                .user(UserInfo.from(user))
                .build();
    }

    private void setRefreshCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie(REFRESH_COOKIE_NAME, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(secureCookie);
        cookie.setPath("/");
        cookie.setMaxAge((int) refreshExpirySeconds);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(secureCookie);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }
}
