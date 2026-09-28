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
        // The old token is left pointing at its replacement so a losing
        // concurrent racer can find the same new pair instead of being
        // treated as a thief.
        verify(refreshTokenRepository, times(1)).linkReplacedBy(eq(10L), any(RefreshToken.class));
        verify(refreshTokenRepository, never()).revokeAllActiveByUser(any(), any());
    }

    @Test
    void refreshLostRaceReturnsWinnersNewPairInsteadOfBurningTheFamily() {
        // Two concurrent /auth/refresh calls present the same not-yet-rotated
        // token (two browser tabs, a retry). This request loses the atomic
        // rotation race, but the winner has already recorded its new token as
        // the replacement -- the loser should simply get that same new pair.
        RefreshToken winnersNewToken = RefreshToken.builder()
                .id(11L)
                .user(user)
                .token("winners-new-refresh")
                .expiresAt(OffsetDateTime.now().plusDays(7))
                .build();
        RefreshToken beforeRace = RefreshToken.builder()
                .id(10L)
                .user(user)
                .token("contended")
                .expiresAt(OffsetDateTime.now().plusDays(1))
                .build();
        RefreshToken afterRace = RefreshToken.builder()
                .id(10L)
                .user(user)
                .token("contended")
                .expiresAt(OffsetDateTime.now().plusDays(1))
                .revokedAt(OffsetDateTime.now())
                .replacedBy(winnersNewToken)
                .build();

        when(refreshTokenRepository.findByToken("contended"))
                .thenReturn(Optional.of(beforeRace))
                .thenReturn(Optional.of(afterRace));
        when(refreshTokenRepository.revokeIfActive(eq("contended"), any())).thenReturn(0);
        UserBuilder ub = org.springframework.security.core.userdetails.User.withUsername("alice")
                .password("h").roles("USER");
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(ub.build());
        when(jwtUtil.generateAccessToken(any())).thenReturn("new-access-for-loser");

        AuthResponse response = authService.refresh("contended");

        assertThat(response.getAccessToken()).isEqualTo("new-access-for-loser");
        assertThat(response.getRefreshToken()).isEqualTo("winners-new-refresh");
        verify(refreshTokenRepository, never()).revokeAllActiveByUser(any(), any());
        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
        verify(jwtUtil, never()).generateRefreshToken();
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
                .hasMessageContaining("Invalid refresh token")
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
                .hasMessageContaining("Invalid refresh token")
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(refreshTokenRepository, times(1)).revokeAllActiveByUser(eq(user), any());
    }

    @Test
    void refreshOfRevokedAndExpiredTokenStillBurnsTheFamily() {
        // A token that is both revoked (rotated away earlier) and, by now,
        // naturally expired must still go through the revoked-token handling
        // (and burn the family, since it has no replacedBy pointer here)
        // rather than short-circuiting on a plain "expired" 401.
        RefreshToken revokedAndExpired = RefreshToken.builder()
                .user(user)
                .token("stale")
                .expiresAt(OffsetDateTime.now().minusDays(1))
                .revokedAt(OffsetDateTime.now().minusDays(2))
                .build();
        when(refreshTokenRepository.findByToken("stale")).thenReturn(Optional.of(revokedAndExpired));

        assertThatThrownBy(() -> authService.refresh("stale"))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Invalid refresh token")
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(refreshTokenRepository, times(1)).revokeAllActiveByUser(eq(user), any());
    }

    @Test
    void refreshOfGenerationsOldTokenStillBurnsTheFamily() {
        // "stored" was rotated forward once (its replacedBy is set), but that
        // replacement has itself since been rotated forward again -- the
        // whole chain has moved on. Replaying this old token is real reuse,
        // not a benign race, even though it does carry a replacedBy pointer.
        RefreshToken longSinceSuperseded = RefreshToken.builder()
                .id(12L)
                .user(user)
                .token("next-generation")
                .expiresAt(OffsetDateTime.now().plusDays(1))
                .revokedAt(OffsetDateTime.now().minusMinutes(1))
                .build();
        RefreshToken oldGeneration = RefreshToken.builder()
                .id(10L)
                .user(user)
                .token("old-generation")
                .expiresAt(OffsetDateTime.now().plusDays(1))
                .revokedAt(OffsetDateTime.now().minusMinutes(5))
                .replacedBy(longSinceSuperseded)
                .build();
        when(refreshTokenRepository.findByToken("old-generation")).thenReturn(Optional.of(oldGeneration));

        assertThatThrownBy(() -> authService.refresh("old-generation"))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Invalid refresh token")
                .extracting("status").isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(refreshTokenRepository, times(1)).revokeAllActiveByUser(eq(user), any());
    }

    @Test
    void refreshFailsForUnknownToken() {
        when(refreshTokenRepository.findByToken(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("nope"))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Invalid refresh token")
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
