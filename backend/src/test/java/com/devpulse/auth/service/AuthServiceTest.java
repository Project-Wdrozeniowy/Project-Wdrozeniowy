package com.devpulse.auth.service;

import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.entity.RefreshToken;
import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.RefreshTokenRepository;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.exception.AppException;
import com.devpulse.security.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private UserDetailsService userDetailsService;

    @InjectMocks
    private AuthService authService;

    private HttpServletResponse httpResponse;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "accessExpirySeconds", 900L);
        ReflectionTestUtils.setField(authService, "refreshExpirySeconds", 604800L);
        ReflectionTestUtils.setField(authService, "secureCookie", false);
        httpResponse = mock(HttpServletResponse.class);
    }

    // ───────────────────────── register ─────────────────────────

    @Test
    void register_happyPath_returnsAccessTokenAndSetsRefreshCookie() {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("alice");
        req.setEmail("alice@example.com");
        req.setPassword("password123");

        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");

        User savedUser = User.builder()
                .id(1L).username("alice").email("alice@example.com")
                .passwordHash("hashed").role(Role.USER).build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        UserDetails ud = org.springframework.security.core.userdetails.User
                .withUsername("alice").password("hashed").authorities(Collections.emptyList()).build();
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(ud);
        when(jwtUtil.generateAccessToken(ud)).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken()).thenReturn("refresh-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(null);

        AuthResponse response = authService.register(req, httpResponse);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getExpiresIn()).isEqualTo(900L);
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getUser()).isNotNull();
        assertThat(response.getUser().username()).isEqualTo("alice");
        verify(userRepository).save(any(User.class));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
        verify(httpResponse).addCookie(any());
    }

    @Test
    void register_duplicateUsername_throwsConflict() {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("alice");
        req.setEmail("alice@example.com");
        req.setPassword("password123");

        when(userRepository.existsByUsername("alice")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req, httpResponse))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Username already taken")
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(userRepository, never()).save(any());
    }

    @Test
    void register_duplicateEmail_throwsConflict() {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("alice");
        req.setEmail("alice@example.com");
        req.setPassword("password123");

        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req, httpResponse))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Email already registered")
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(userRepository, never()).save(any());
    }

    // ───────────────────────── login ─────────────────────────

    @Test
    void login_happyPath_returnsAccessTokenAndDeletesOldRefreshTokens() {
        AuthRequest req = new AuthRequest();
        req.setUsername("alice");
        req.setPassword("password123");

        when(authenticationManager.authenticate(any())).thenReturn(
                new UsernamePasswordAuthenticationToken("alice", "password123"));

        User user = User.builder()
                .id(1L).username("alice").email("alice@example.com")
                .passwordHash("hashed").role(Role.USER).build();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        UserDetails ud = org.springframework.security.core.userdetails.User
                .withUsername("alice").password("hashed").authorities(Collections.emptyList()).build();
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(ud);
        when(jwtUtil.generateAccessToken(ud)).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken()).thenReturn("refresh-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(null);

        AuthResponse response = authService.login(req, httpResponse);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getUser().username()).isEqualTo("alice");
        verify(refreshTokenRepository).deleteAllByUser(user);
        verify(httpResponse).addCookie(any());
    }

    @Test
    void login_badCredentials_propagatesAuthenticationException() {
        AuthRequest req = new AuthRequest();
        req.setUsername("alice");
        req.setPassword("wrong-password");

        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(req, httpResponse))
                .isInstanceOf(BadCredentialsException.class);

        verify(userRepository, never()).findByUsername(any());
    }

    // ───────────────────────── refresh ─────────────────────────

    @Test
    void refresh_validToken_returnsNewAccessTokenAndRotatesCookie() {
        User user = User.builder()
                .id(1L).username("alice").email("alice@example.com")
                .passwordHash("hashed").role(Role.USER).build();
        RefreshToken stored = RefreshToken.builder()
                .token("valid-refresh")
                .user(user)
                .expiresAt(OffsetDateTime.now().plusHours(1))
                .build();

        when(refreshTokenRepository.findByToken("valid-refresh")).thenReturn(Optional.of(stored));

        UserDetails ud = org.springframework.security.core.userdetails.User
                .withUsername("alice").password("hashed").authorities(Collections.emptyList()).build();
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(ud);
        when(jwtUtil.generateAccessToken(ud)).thenReturn("new-access-token");
        when(jwtUtil.generateRefreshToken()).thenReturn("new-refresh-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(null);

        AuthResponse response = authService.refresh("valid-refresh", httpResponse);

        assertThat(response.getAccessToken()).isEqualTo("new-access-token");
        assertThat(response.getExpiresIn()).isEqualTo(900L);
        verify(refreshTokenRepository).delete(stored);
        verify(httpResponse).addCookie(any());
    }

    @Test
    void refresh_tokenNotFound_throwsUnauthorized() {
        when(refreshTokenRepository.findByToken("unknown-token")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("unknown-token", httpResponse))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("not found")
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void refresh_expiredToken_deletesTokenAndThrowsUnauthorized() {
        User user = User.builder()
                .id(1L).username("alice").passwordHash("hashed").role(Role.USER).build();
        RefreshToken expired = RefreshToken.builder()
                .token("expired-refresh")
                .user(user)
                .expiresAt(OffsetDateTime.now().minusHours(1))
                .build();

        when(refreshTokenRepository.findByToken("expired-refresh")).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.refresh("expired-refresh", httpResponse))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("expired")
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));

        verify(refreshTokenRepository).delete(expired);
    }

    @Test
    void refresh_nullToken_throwsUnauthorized() {
        assertThatThrownBy(() -> authService.refresh(null, httpResponse))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("not found")
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    // ───────────────────────── me ─────────────────────────

    @Test
    void me_validToken_returnsUserAndRotatesCookie() {
        User user = User.builder()
                .id(1L).username("alice").email("alice@example.com")
                .passwordHash("hashed").role(Role.USER).build();
        RefreshToken stored = RefreshToken.builder()
                .token("valid-refresh")
                .user(user)
                .expiresAt(OffsetDateTime.now().plusHours(1))
                .build();

        when(refreshTokenRepository.findByToken("valid-refresh")).thenReturn(Optional.of(stored));

        UserDetails ud = org.springframework.security.core.userdetails.User
                .withUsername("alice").password("hashed").authorities(Collections.emptyList()).build();
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(ud);
        when(jwtUtil.generateAccessToken(ud)).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken()).thenReturn("new-refresh");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenReturn(null);

        AuthResponse response = authService.me("valid-refresh", httpResponse);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getUser().username()).isEqualTo("alice");
        verify(refreshTokenRepository).delete(stored);
        verify(httpResponse).addCookie(any());
    }

    @Test
    void me_nullToken_throwsUnauthorized() {
        assertThatThrownBy(() -> authService.me(null, httpResponse))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("No session found")
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void me_expiredToken_deletesTokenAndThrowsUnauthorized() {
        User user = User.builder()
                .id(1L).username("alice").passwordHash("hashed").role(Role.USER).build();
        RefreshToken expired = RefreshToken.builder()
                .token("expired-refresh").user(user)
                .expiresAt(OffsetDateTime.now().minusHours(1)).build();

        when(refreshTokenRepository.findByToken("expired-refresh")).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.me("expired-refresh", httpResponse))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("expired")
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));

        verify(refreshTokenRepository).delete(expired);
    }

    // ───────────────────────── logout ─────────────────────────

    @Test
    void logout_withValidToken_deletesTokenAndClearsCookie() {
        User user = User.builder()
                .id(1L).username("alice").passwordHash("hashed").role(Role.USER).build();
        RefreshToken stored = RefreshToken.builder()
                .token("valid-refresh").user(user)
                .expiresAt(OffsetDateTime.now().plusHours(1)).build();

        when(refreshTokenRepository.findByToken("valid-refresh")).thenReturn(Optional.of(stored));

        authService.logout("valid-refresh", httpResponse);

        verify(refreshTokenRepository).delete(stored);
        verify(httpResponse).addCookie(any());
    }

    @Test
    void logout_withNullToken_justClearsCookie() {
        authService.logout(null, httpResponse);

        verify(refreshTokenRepository, never()).findByToken(any());
        verify(httpResponse).addCookie(any());
    }
}
