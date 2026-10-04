package com.devpulse.user.controller;

import com.devpulse.exception.AppException;
import com.devpulse.exception.GlobalExceptionHandler;
import com.devpulse.user.dto.ProfileResponse;
import com.devpulse.user.dto.PublicProfileResponse;
import com.devpulse.user.service.UserService;
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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer tests for {@link UserController}: request validation, status codes
 * and the shape of the responses. Authentication itself is covered by the
 * security tests; the service is mocked.
 */
@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    // ───────────────────────── GET /users/me ─────────────────────────

    @Test
    void currentProfile_returnsFullProfile() throws Exception {
        when(userService.getCurrentProfile()).thenReturn(ProfileResponse.builder()
                .id(1L)
                .username("alice")
                .email("alice@example.com")
                .displayName("Alice")
                .postCount(3)
                .commentCount(5)
                .build());

        mockMvc.perform(get("/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.displayName").value("Alice"));
    }

    // ───────────────────────── PATCH /users/me ─────────────────────────

    @Test
    void updateProfile_validRequest_returnsUpdatedProfile() throws Exception {
        when(userService.updateProfile(any())).thenReturn(ProfileResponse.builder()
                .id(1L)
                .username("alice")
                .email("new@example.com")
                .displayName("Alice B.")
                .build());

        mockMvc.perform(patch("/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"new@example.com","displayName":"Alice B.",
                                 "avatarUrl":"https://cdn.example.com/a.png","bio":"Hello"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("new@example.com"))
                .andExpect(jsonPath("$.displayName").value("Alice B."));
    }

    @Test
    void updateProfile_invalidEmail_returns400WithFieldError() throws Exception {
        mockMvc.perform(patch("/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists());

        verifyNoInteractions(userService);
    }

    @Test
    void updateProfile_invalidAvatarUrl_returns400WithFieldError() throws Exception {
        mockMvc.perform(patch("/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatarUrl\":\"not a url\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.avatarUrl").exists());

        verifyNoInteractions(userService);
    }

    @Test
    void updateProfile_emailTakenByAnotherAccount_returns409() throws Exception {
        when(userService.updateProfile(any()))
                .thenThrow(new AppException("Email already registered", HttpStatus.CONFLICT));

        mockMvc.perform(patch("/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"taken@example.com\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Email already registered"));
    }

    // ───────────────────────── POST /users/me/password ─────────────────────────

    @Test
    void changePassword_validRequest_returns204() throws Exception {
        mockMvc.perform(post("/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"old-password\",\"newPassword\":\"new-password-123\"}"))
                .andExpect(status().isNoContent());

        verify(userService).changePassword(any());
    }

    @Test
    void changePassword_newPasswordTooShort_returns400() throws Exception {
        mockMvc.perform(post("/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"old-password\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.newPassword").exists());

        verify(userService, never()).changePassword(any());
    }

    @Test
    void changePassword_blankCurrentPassword_returns400() throws Exception {
        mockMvc.perform(post("/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"\",\"newPassword\":\"new-password-123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.currentPassword").exists());
    }

    @Test
    void changePassword_wrongCurrentPassword_returns400() throws Exception {
        doThrow(new AppException("Current password is incorrect", HttpStatus.BAD_REQUEST))
                .when(userService).changePassword(any());

        mockMvc.perform(post("/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"wrong\",\"newPassword\":\"new-password-123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Current password is incorrect"));
    }

    // ───────────────────────── GET /users/{username} ─────────────────────────

    @Test
    void publicProfile_doesNotLeakPrivateFields() throws Exception {
        when(userService.getPublicProfile("alice")).thenReturn(PublicProfileResponse.builder()
                .id(1L)
                .username("alice")
                .displayName("Alice")
                .postCount(3)
                .commentCount(5)
                .build());

        mockMvc.perform(get("/users/alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.status").doesNotExist())
                .andExpect(jsonPath("$.role").doesNotExist());
    }

    @Test
    void publicProfile_unknownUser_returns404() throws Exception {
        when(userService.getPublicProfile("ghost"))
                .thenThrow(new AppException("User not found", HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/users/ghost"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("User not found"));
    }
}
