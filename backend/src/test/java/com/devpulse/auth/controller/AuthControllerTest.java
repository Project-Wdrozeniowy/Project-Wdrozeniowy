package com.devpulse.auth.controller;

import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.dto.UserInfo;
import com.devpulse.auth.service.AuthService;
import com.devpulse.exception.AppException;
import com.devpulse.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    private static final UserInfo SAMPLE_USER = new UserInfo("1", "alice", "alice@example.com", "USER");

    private static final AuthResponse SAMPLE_RESPONSE = AuthResponse.builder()
            .accessToken("access-token")
            .tokenType("Bearer")
            .expiresIn(900L)
            .user(SAMPLE_USER)
            .build();

    // ───────────────────────── POST /auth/register ─────────────────────────

    @Test
    void register_validRequest_returns201WithAccessToken() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("alice");
        req.setEmail("alice@example.com");
        req.setPassword("password123");

        when(authService.register(any(RegisterRequest.class), any())).thenReturn(SAMPLE_RESPONSE);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.user.username").value("alice"));
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

        when(authService.register(any(RegisterRequest.class), any()))
                .thenThrow(new AppException("Username already taken", HttpStatus.CONFLICT));

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    // ───────────────────────── POST /auth/login ─────────────────────────

    @Test
    void login_validCredentials_returns200WithAccessToken() throws Exception {
        AuthRequest req = new AuthRequest();
        req.setUsername("alice");
        req.setPassword("password123");

        when(authService.login(any(AuthRequest.class), any())).thenReturn(SAMPLE_RESPONSE);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.user.username").value("alice"));
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

    // ───────────────────────── POST /auth/refresh ─────────────────────────

    @Test
    void refresh_withValidCookie_returns200WithNewAccessToken() throws Exception {
        when(authService.refresh(eq("valid-refresh-token"), any())).thenReturn(SAMPLE_RESPONSE);

        mockMvc.perform(post("/auth/refresh")
                        .cookie(new Cookie("refreshToken", "valid-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"));
    }

    @Test
    void refresh_missingCookie_returns401() throws Exception {
        when(authService.refresh(isNull(), any()))
                .thenThrow(new AppException("Refresh token not found", HttpStatus.UNAUTHORIZED));

        mockMvc.perform(post("/auth/refresh"))
                .andExpect(status().isUnauthorized());
    }

    // ───────────────────────── GET /auth/me ─────────────────────────

    @Test
    void me_withValidCookie_returns200WithUserAndAccessToken() throws Exception {
        when(authService.me(eq("valid-refresh-token"), any())).thenReturn(SAMPLE_RESPONSE);

        mockMvc.perform(get("/auth/me")
                        .cookie(new Cookie("refreshToken", "valid-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.user.username").value("alice"));
    }

    @Test
    void me_missingCookie_returns401() throws Exception {
        when(authService.me(isNull(), any()))
                .thenThrow(new AppException("No session found", HttpStatus.UNAUTHORIZED));

        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    // ───────────────────────── POST /auth/logout ─────────────────────────

    @Test
    void logout_withCookie_returns204() throws Exception {
        doNothing().when(authService).logout(eq("valid-refresh-token"), any());

        mockMvc.perform(post("/auth/logout")
                        .cookie(new Cookie("refreshToken", "valid-refresh-token")))
                .andExpect(status().isNoContent());
    }

    @Test
    void logout_withoutCookie_returns204() throws Exception {
        doNothing().when(authService).logout(isNull(), any());

        mockMvc.perform(post("/auth/logout"))
                .andExpect(status().isNoContent());
    }
}
