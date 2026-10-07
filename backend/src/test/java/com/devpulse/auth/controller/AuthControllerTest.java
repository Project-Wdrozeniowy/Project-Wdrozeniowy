package com.devpulse.auth.controller;

import com.devpulse.auth.cookie.RefreshTokenCookies;
import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.service.AuthService;
import com.devpulse.exception.AppException;
import com.devpulse.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import jakarta.servlet.http.Cookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.mockito.ArgumentMatchers.any;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    private AuthController authController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        authController = new AuthController(authService, new RefreshTokenCookies(true, "/api/auth", 604800L));

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    private static final AuthResponse SAMPLE_RESPONSE = AuthResponse.builder()
            .accessToken("access-token")
            .refreshToken("refresh-token")
            .tokenType("Bearer")
            .expiresIn(900L)
            .build();

    // ───────────────────────── POST /auth/register ─────────────────────────

    @Test
    void register_validRequest_returns201WithTokens() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("alice");
        req.setEmail("alice@example.com");
        req.setPassword("password123");

        when(authService.register(any(RegisterRequest.class))).thenReturn(SAMPLE_RESPONSE);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refreshToken=refresh-token")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Strict")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/api/auth")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=604800")));
    }

    @Test
    void register_blankUsername_returns400() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("");
        req.setEmail("alice@example.com");
        req.setPassword("password123");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_invalidEmail_returns400() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("alice");
        req.setEmail("not-an-email");
        req.setPassword("password123");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_passwordTooShort_returns400() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("alice");
        req.setEmail("alice@example.com");
        req.setPassword("short");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_duplicateUsername_returns409() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("alice");
        req.setEmail("alice@example.com");
        req.setPassword("password123");

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new AppException("Username already taken", HttpStatus.CONFLICT));

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    // ───────────────────────── POST /auth/login ─────────────────────────

    @Test
    void login_validCredentials_returns200WithTokens() throws Exception {
        AuthRequest req = new AuthRequest();
        req.setUsername("alice");
        req.setPassword("password123");

        when(authService.login(any(AuthRequest.class))).thenReturn(SAMPLE_RESPONSE);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refreshToken=refresh-token")));
    }

    @Test
    void login_blankUsername_returns400() throws Exception {
        AuthRequest req = new AuthRequest();
        req.setUsername("");
        req.setPassword("password123");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_blankPassword_returns400() throws Exception {
        AuthRequest req = new AuthRequest();
        req.setUsername("alice");
        req.setPassword("");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_badCredentials_returns401ProblemDetail() throws Exception {
        AuthRequest req = new AuthRequest();
        req.setUsername("alice");
        req.setPassword("wrong-password");

        when(authService.login(any(AuthRequest.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.detail").value("Authentication failed"));
    }

    // ───────────────────────── POST /auth/refresh ─────────────────────────

    @Test
    void refresh_validCookie_returns200AndRotatesCookie() throws Exception {
        when(authService.refresh("valid-refresh-token")).thenReturn(SAMPLE_RESPONSE);

        mockMvc.perform(post("/auth/refresh")
                        .cookie(new Cookie(RefreshTokenCookies.NAME, "valid-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refreshToken=refresh-token")));
    }

    @Test
    void refresh_missingCookie_returns401AndClearsCookie() throws Exception {
        when(authService.refresh(isNull()))
                .thenThrow(new AppException("Invalid refresh token", HttpStatus.UNAUTHORIZED));

        mockMvc.perform(post("/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));
    }

    @Test
    void refresh_invalidToken_returns401AndClearsCookie() throws Exception {
        when(authService.refresh("unknown-token"))
                .thenThrow(new AppException("Invalid refresh token", HttpStatus.UNAUTHORIZED));

        mockMvc.perform(post("/auth/refresh")
                        .cookie(new Cookie(RefreshTokenCookies.NAME, "unknown-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));
    }

    @Test
    void refresh_nonAuthFailure_doesNotClearCookie() throws Exception {
        when(authService.refresh("token"))
                .thenThrow(new AppException("Boom", HttpStatus.INTERNAL_SERVER_ERROR));

        mockMvc.perform(post("/auth/refresh")
                        .cookie(new Cookie(RefreshTokenCookies.NAME, "token")))
                .andExpect(status().isInternalServerError())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
    }

    // ───────────────────────── POST /auth/logout ─────────────────────────

    @Test
    void logout_withCookie_revokesTokenAndClearsCookie() throws Exception {
        mockMvc.perform(post("/auth/logout")
                        .cookie(new Cookie(RefreshTokenCookies.NAME, "live-token")))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, not(containsString("live-token"))));

        verify(authService).logout("live-token");
    }

    @Test
    void logout_withoutCookie_isIdempotent() throws Exception {
        mockMvc.perform(post("/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));

        verify(authService).logout(null);
    }
}
