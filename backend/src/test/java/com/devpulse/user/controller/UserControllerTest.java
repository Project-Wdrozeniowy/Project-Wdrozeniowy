package com.devpulse.user.controller;

import com.devpulse.exception.AppException;
import com.devpulse.exception.GlobalExceptionHandler;
import com.devpulse.user.dto.MyProfileDto;
import com.devpulse.user.dto.UserProfileDto;
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
    void currentProfileReturnsTheFullProfile() throws Exception {
        when(userService.getCurrentProfile()).thenReturn(MyProfileDto.builder()
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
    void updateProfileReturnsTheUpdatedProfile() throws Exception {
        when(userService.updateProfile(any())).thenReturn(MyProfileDto.builder()
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
    void updateProfileRejectsABioOverTheContractLimit() throws Exception {
        mockMvc.perform(patch("/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bio\":\"" + "x".repeat(1001) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.bio").exists());

        verifyNoInteractions(userService);
    }

    @Test
    void updateProfileRejectsAnInvalidEmailWithAFieldError() throws Exception {
        mockMvc.perform(patch("/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists());

        verifyNoInteractions(userService);
    }

    @Test
    void updateProfileRejectsAnInvalidAvatarUrlWithAFieldError() throws Exception {
        mockMvc.perform(patch("/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatarUrl\":\"not a url\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.avatarUrl").exists());

        verifyNoInteractions(userService);
    }

    @Test
    void updateProfileRejectsAnAvatarUrlThatIsNotHttp() throws Exception {
        mockMvc.perform(patch("/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatarUrl\":\"ftp://files.example.com/a.png\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.avatarUrl").exists());

        verifyNoInteractions(userService);
    }

    @Test
    void updateProfileAcceptsAnEmptyAvatarUrlThatClearsIt() throws Exception {
        when(userService.updateProfile(any())).thenReturn(MyProfileDto.builder().id(1L).username("alice").build());

        mockMvc.perform(patch("/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatarUrl\":\"\"}"))
                .andExpect(status().isOk());

        verify(userService).updateProfile(any());
    }

    @Test
    void updateProfileAnswers409ForAnEmailOfAnotherAccount() throws Exception {
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
    void changePasswordReturns204() throws Exception {
        mockMvc.perform(post("/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"old-password\",\"newPassword\":\"new-password-123\"}"))
                .andExpect(status().isNoContent());

        verify(userService).changePassword(any());
    }

    @Test
    void changePasswordRejectsANewPasswordThatIsTooShort() throws Exception {
        mockMvc.perform(post("/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"old-password\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.newPassword").exists());

        verify(userService, never()).changePassword(any());
    }

    @Test
    void changePasswordRejectsABlankCurrentPassword() throws Exception {
        mockMvc.perform(post("/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"\",\"newPassword\":\"new-password-123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.currentPassword").exists());
    }

    @Test
    void changePasswordRejectsAWrongCurrentPassword() throws Exception {
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
    void publicProfileReturnsTheContractFieldsWithoutEmail() throws Exception {
        when(userService.getPublicProfile("alice")).thenReturn(UserProfileDto.builder()
                .id(1L)
                .username("alice")
                .displayName("Alice")
                .role("MODERATOR")
                .status("ACTIVE")
                .postCount(3)
                .commentCount(5)
                .build());

        mockMvc.perform(get("/users/alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.role").value("MODERATOR"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.email").doesNotExist());
    }

    @Test
    void publicProfileOfAnUnknownUserIs404() throws Exception {
        when(userService.getPublicProfile("ghost"))
                .thenThrow(new AppException("User not found", HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/users/ghost"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("User not found"));
    }
}
