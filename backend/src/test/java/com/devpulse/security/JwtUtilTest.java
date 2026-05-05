package com.devpulse.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collections;

import static org.assertj.core.api.Assertions.*;

class JwtUtilTest {

    // Base64 of "test-secret-key-that-is-long-enough-for-hs256-algorithm" (54 bytes)
    private static final String BASE64_SECRET =
            "dGVzdC1zZWNyZXQta2V5LXRoYXQtaXMtbG9uZy1lbm91Z2gtZm9yLWhtYWMtc2hhMjU2";

    // Plain text 32-byte secret
    private static final String PLAIN_SECRET = "plain-secret-32-bytes-padding-ab";

    private JwtUtil jwtUtil;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(BASE64_SECRET, 900L);
        userDetails = User.withUsername("testuser")
                .password("irrelevant")
                .authorities(Collections.emptyList())
                .build();
    }

    @Test
    void constructorAcceptsBase64Secret() {
        assertThatNoException().isThrownBy(() -> new JwtUtil(BASE64_SECRET, 900L));
    }

    @Test
    void constructorAcceptsPlainTextSecret() {
        assertThatNoException().isThrownBy(() -> new JwtUtil(PLAIN_SECRET, 900L));
    }

    @Test
    void constructorRejectsTooShortSecret() {
        assertThatThrownBy(() -> new JwtUtil("tooshort", 900L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
    }

    @Test
    void generateAccessTokenReturnsNonBlankString() {
        String token = jwtUtil.generateAccessToken(userDetails);
        assertThat(token).isNotBlank();
    }

    @Test
    void generateAccessTokenContainsUsername() {
        String token = jwtUtil.generateAccessToken(userDetails);
        String extractedUsername = jwtUtil.extractUsername(token);
        assertThat(extractedUsername).isEqualTo("testuser");
    }

    @Test
    void generateRefreshTokenIs64HexChars() {
        String refreshToken = jwtUtil.generateRefreshToken();
        assertThat(refreshToken)
                .isNotBlank()
                .hasSize(64)
                .matches("[0-9a-f]{64}");
    }

    @Test
    void generateRefreshTokenIsUnique() {
        String token1 = jwtUtil.generateRefreshToken();
        String token2 = jwtUtil.generateRefreshToken();
        assertThat(token1).isNotEqualTo(token2);
    }

    @Test
    void isTokenValidReturnsTrueForValidToken() {
        String token = jwtUtil.generateAccessToken(userDetails);
        assertThat(jwtUtil.isTokenValid(token, userDetails)).isTrue();
    }

    @Test
    void isTokenValidReturnsFalseForWrongUser() {
        String token = jwtUtil.generateAccessToken(userDetails);
        UserDetails otherUser = User.withUsername("otheruser")
                .password("irrelevant")
                .authorities(Collections.emptyList())
                .build();
        assertThat(jwtUtil.isTokenValid(token, otherUser)).isFalse();
    }

    @Test
    void isTokenValidReturnsFalseForExpiredToken() {
        JwtUtil shortLivedUtil = new JwtUtil(BASE64_SECRET, -1L);
        String expiredToken = shortLivedUtil.generateAccessToken(userDetails);
        assertThat(jwtUtil.isTokenValid(expiredToken, userDetails)).isFalse();
    }

    @Test
    void isTokenValidReturnsFalseForGarbage() {
        assertThat(jwtUtil.isTokenValid("not.a.jwt", userDetails)).isFalse();
    }

    @Test
    void extractUsernameThrowsOnInvalidToken() {
        assertThatThrownBy(() -> jwtUtil.extractUsername("garbage"))
                .isInstanceOf(Exception.class);
    }
}
