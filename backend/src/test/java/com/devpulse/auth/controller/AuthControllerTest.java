package com.devpulse.auth.controller;

import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.dto.RefreshRequest;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.service.AuthService;
import com.devpulse.exception.AppException;
import com.devpulse.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
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
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900));
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
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"));
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
    void refresh_validToken_returns200WithNewAccessToken() throws Exception {
        RefreshRequest req = new RefreshRequest();
        req.setRefreshToken("valid-refresh-token");

        when(authService.refresh(anyString())).thenReturn(SAMPLE_RESPONSE);

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"));
    }

    @Test
    void refresh_blankRefreshToken_returns400() throws Exception {
        RefreshRequest req = new RefreshRequest();
        req.setRefreshToken("");

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void refresh_tokenNotFound_returns401() throws Exception {
        RefreshRequest req = new RefreshRequest();
        req.setRefreshToken("unknown-token");

        when(authService.refresh("unknown-token"))
                .thenThrow(new AppException("Refresh token not found", HttpStatus.UNAUTHORIZED));

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }
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
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900));
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
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"));
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
    void refresh_validToken_returns200WithNewAccessToken() throws Exception {
        RefreshRequest req = new RefreshRequest();
        req.setRefreshToken("valid-refresh-token");

        when(authService.refresh(anyString())).thenReturn(SAMPLE_RESPONSE);

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"));
    }

    @Test
    void refresh_blankRefreshToken_returns400() throws Exception {
        RefreshRequest req = new RefreshRequest();
        req.setRefreshToken("");

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void refresh_tokenNotFound_returns401() throws Exception {
        RefreshRequest req = new RefreshRequest();
        req.setRefreshToken("unknown-token");

        when(authService.refresh("unknown-token"))
                .thenThrow(new AppException("Refresh token not found", HttpStatus.UNAUTHORIZED));

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }
}
