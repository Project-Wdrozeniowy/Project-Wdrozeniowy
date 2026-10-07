package com.devpulse.auth.controller;

import com.devpulse.auth.cookie.RefreshTokenCookies;
import com.devpulse.support.MigratedSchemaTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The cookie-based session flow through the full security filter chain, the
 * application's own JSON mapper and the real schema: the refresh token only
 * ever travels in the {@code HttpOnly} cookie.
 */
@MigratedSchemaTest
@Transactional
class AuthCookieFlowTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void registerRefreshLogout() throws Exception {
        String username = "cookie-" + UUID.randomUUID().toString().substring(0, 8);

        MockHttpServletResponse registered = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\": \"" + username + "\", \"email\": \"" + username
                                + "@example.com\", \"password\": \"password123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andReturn().getResponse();
        Cookie first = refreshCookie(registered);

        MockHttpServletResponse refreshed = mockMvc.perform(post("/auth/refresh").cookie(first))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andReturn().getResponse();
        Cookie second = refreshCookie(refreshed);
        assertThat(second.getValue()).isNotEqualTo(first.getValue());

        MockHttpServletResponse loggedOut = mockMvc.perform(post("/auth/logout").cookie(second))
                .andExpect(status().isNoContent())
                .andReturn().getResponse();
        assertThat(refreshCookie(loggedOut).getMaxAge()).isZero();

        mockMvc.perform(post("/auth/refresh").cookie(second))
                .andExpect(status().isUnauthorized());
    }

    private static Cookie refreshCookie(MockHttpServletResponse response) {
        Cookie cookie = response.getCookie(RefreshTokenCookies.NAME);
        assertThat(cookie).as("refresh cookie in %s", response.getHeaders(HttpHeaders.SET_COOKIE)).isNotNull();
        return cookie;
    }
}
