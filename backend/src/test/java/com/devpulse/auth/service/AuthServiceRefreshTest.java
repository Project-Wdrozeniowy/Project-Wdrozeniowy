package com.devpulse.auth.service;

import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.entity.RefreshToken;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.RefreshTokenRepository;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.exception.AppException;
import com.devpulse.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.User.UserBuilder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests covering refresh-token rotation, reuse detection and logout
 * in {@link AuthService}.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceRefreshTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private UserDetailsService userDetailsService;

    @InjectMocks private AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "accessExpirySeconds", 900L);
        ReflectionTestUtils.setField(authService, "refreshExpirySeconds", 604800L);

        user = User.builder().id(1L).username("alice").email("a@b.c").passwordHash("h").build();
    }

    @Test
    void refreshRotatesTokenOnHappyPath() {
        RefreshToken stored = RefreshToken.builder()
                .id(10L)
                .user(user)
                .token("old-token")
                .expiresAt(OffsetDateTime.now().plusDays(1))
                .build();
        when(refreshTokenRepository.findByToken("old-token")).thenReturn(Optional.of(stored));
        when(refreshTokenRepository.revokeIfActive(eq("old-token"), any())).thenReturn(1);
        UserBuilder ub = org.springframework.security.core.userdetails.User.withUsername("alice")
                .password("h").roles("USER");
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(ub.build());
        when(jwtUtil.generateAccessToken(any())).thenReturn("new-access");
        when(jwtUtil.generateRefreshToken()).thenReturn("new-refresh");

        AuthResponse response = authService.refresh("old-token");

        assertThat(response.getAccessToken()).isEqualTo("new-access");
        assertThat(response.getRefreshToken()).isEqualTo("new-refresh");
        verify(refreshTokenRepository, times(1)).revokeIfActive(eq("old-token"), any());
        // Only the newly issued refresh token is persisted; the old one is revoked
        // by the atomic UPDATE, no entity save needed.
        verify(refreshTokenRepository, times(1)).save(any(RefreshToken.class));
        verify(refreshTokenRepository, never()).revokeAllActiveByUser(any(), any());
    }

    @Test
    void refreshTreatsLostRaceAsReuseAndBurnsTheFamily() {
        RefreshToken stored = RefreshToken.builder()
                .id(10L)
                .user(user)
                .token("contended")
                .expiresAt(OffsetDateTime.now().plusDays(1))
                .build();
        when(refreshTokenRepository.findByToken("contended")).thenReturn(Optional.of(stored));
        when(refreshTokenRepository.revokeIfActive(eq("contended"), any())).thenReturn(0);

        assertThatThrownBy(() -> authService.refresh("contended"))
                .isInstanceOf(AppException.class)
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(refreshTokenRepository, times(1)).revokeAllActiveByUser(eq(user), any());
        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
    }

    @Test
    void refreshRejectsExpiredToken() {
        RefreshToken stored = RefreshToken.builder()
                .user(user)
                .token("expired")
                .expiresAt(OffsetDateTime.now().minusDays(1))
                .build();
        when(refreshTokenRepository.findByToken("expired")).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> authService.refresh("expired"))
                .isInstanceOf(AppException.class)
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(refreshTokenRepository, never()).revokeAllActiveByUser(any(), any());
    }

    @Test
    void refreshDetectsReuseAndBurnsTheFamily() {
        RefreshToken revoked = RefreshToken.builder()
                .user(user)
                .token("stolen")
                .expiresAt(OffsetDateTime.now().plusDays(1))
                .revokedAt(OffsetDateTime.now().minusMinutes(5))
                .build();
        when(refreshTokenRepository.findByToken("stolen")).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> authService.refresh("stolen"))
                .isInstanceOf(AppException.class)
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(refreshTokenRepository, times(1)).revokeAllActiveByUser(eq(user), any());
    }

    @Test
    void refreshFailsForUnknownToken() {
        when(refreshTokenRepository.findByToken(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("nope"))
                .isInstanceOf(AppException.class)
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void logoutIsIdempotentForUnknownToken() {
        when(refreshTokenRepository.findByToken("nope")).thenReturn(Optional.empty());

        authService.logout("nope");

        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    void logoutMarksTokenRevoked() {
        RefreshToken stored = RefreshToken.builder()
                .user(user)
                .token("live")
                .expiresAt(OffsetDateTime.now().plusDays(1))
                .build();
        when(refreshTokenRepository.findByToken("live")).thenReturn(Optional.of(stored));

        authService.logout("live");

        assertThat(stored.getRevokedAt()).isNotNull();
        verify(refreshTokenRepository).save(stored);
    }

    @Test
    void logoutOnAlreadyRevokedTokenIsNoOp() {
        RefreshToken stored = RefreshToken.builder()
                .user(user)
                .token("done")
                .expiresAt(OffsetDateTime.now().plusDays(1))
                .revokedAt(OffsetDateTime.now().minusHours(1))
                .build();
        when(refreshTokenRepository.findByToken("done")).thenReturn(Optional.of(stored));

        authService.logout("done");

        verify(refreshTokenRepository, never()).save(any());
    }
}
