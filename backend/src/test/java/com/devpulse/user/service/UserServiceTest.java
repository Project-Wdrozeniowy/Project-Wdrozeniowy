package com.devpulse.user.service;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.RefreshTokenRepository;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.exception.AppException;
import com.devpulse.user.dto.ChangePasswordRequest;
import com.devpulse.user.dto.MyProfileDto;
import com.devpulse.user.dto.UpdateProfileRequest;
import com.devpulse.user.dto.UserProfileDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link UserService} covering the four endpoints exposed by
 * {@link com.devpulse.user.controller.UserController}.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticatedUserResolver currentUser;

    @InjectMocks private UserService userService;

    private User principal;

    @BeforeEach
    void setUp() {
        principal = User.builder()
                .id(1L).username("alice").email("alice@example.com")
                .passwordHash("hashed").role(Role.USER).status(UserStatus.ACTIVE)
                .displayName("Alice").bio("hi").avatarUrl("https://img/a.png")
                .postCount(2).commentCount(5)
                .build();
    }

    @Test
    void getCurrentProfile_returnsFullProfile() {
        when(currentUser.currentUser()).thenReturn(principal);

        MyProfileDto response = userService.getCurrentProfile();

        assertThat(response.getUsername()).isEqualTo("alice");
        assertThat(response.getEmail()).isEqualTo("alice@example.com");
        assertThat(response.getRole()).isEqualTo("USER");
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        assertThat(response.getPostCount()).isEqualTo(2);
    }

    @Test
    void getPublicProfile_hidesPrivateFields() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(principal));

        UserProfileDto response = userService.getPublicProfile("alice");

        assertThat(response.getUsername()).isEqualTo("alice");
        assertThat(response.getDisplayName()).isEqualTo("Alice");
        assertThat(response.getRole()).isEqualTo("USER");
        // Only the own profile type carries the email address.
        assertThat(response).isNotInstanceOf(MyProfileDto.class);
    }

    @Test
    void getPublicProfile_throwsNotFound() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getPublicProfile("ghost"))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void updateProfile_appliesNonNullFields() {
        when(currentUser.currentUser()).thenReturn(principal);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDisplayName("Alicia");
        req.setBio("new bio");
        req.setAvatarUrl(null); // explicitly unchanged
        req.setEmail(null);

        MyProfileDto response = userService.updateProfile(req);

        assertThat(response.getDisplayName()).isEqualTo("Alicia");
        assertThat(response.getBio()).isEqualTo("new bio");
        assertThat(response.getAvatarUrl()).isEqualTo("https://img/a.png");
        verify(userRepository).saveAndFlush(principal);
    }

    @Test
    void updateProfile_emptyStringClearsOptionalFields() {
        when(currentUser.currentUser()).thenReturn(principal);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDisplayName("");
        req.setAvatarUrl("  ");
        req.setBio("");

        MyProfileDto response = userService.updateProfile(req);

        assertThat(response.getDisplayName()).isNull();
        assertThat(response.getAvatarUrl()).isNull();
        assertThat(response.getBio()).isNull();
    }

    @Test
    void updateProfile_emailTakenConcurrently_returnsConflict() {
        // Both requests pass the existsByEmail check; the unique constraint
        // rejects the second one when it is flushed.
        when(currentUser.currentUser()).thenReturn(principal);
        when(userRepository.existsByEmail("raced@example.com")).thenReturn(false);
        when(userRepository.saveAndFlush(principal))
                .thenThrow(new DataIntegrityViolationException("users_email_key"));

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setEmail("raced@example.com");

        assertThatThrownBy(() -> userService.updateProfile(req))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void updateProfile_rejectsDuplicateEmail() {
        when(currentUser.currentUser()).thenReturn(principal);
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setEmail("taken@example.com");

        assertThatThrownBy(() -> userService.updateProfile(req))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.CONFLICT));
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void updateProfile_changesEmailWhenUnique() {
        when(currentUser.currentUser()).thenReturn(principal);
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setEmail("new@example.com");

        MyProfileDto response = userService.updateProfile(req);

        assertThat(response.getEmail()).isEqualTo("new@example.com");
        verify(userRepository).saveAndFlush(principal);
    }

    @Test
    void changePassword_rejectsWrongCurrent() {
        when(currentUser.currentUser()).thenReturn(principal);
        when(passwordEncoder.matches("nope", "hashed")).thenReturn(false);

        ChangePasswordRequest req = new ChangePasswordRequest("nope", "brandNew123");

        assertThatThrownBy(() -> userService.changePassword(req))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
        verify(userRepository, never()).save(any());
        verify(refreshTokenRepository, never()).revokeAllActiveByUser(any(), any());
    }

    @Test
    void changePassword_hashesAndInvalidatesRefreshTokens() {
        when(currentUser.currentUser()).thenReturn(principal);
        when(passwordEncoder.matches("oldPass", "hashed")).thenReturn(true);
        when(passwordEncoder.encode("brandNew123")).thenReturn("newHash");

        ChangePasswordRequest req = new ChangePasswordRequest("oldPass", "brandNew123");

        userService.changePassword(req);

        assertThat(principal.getPasswordHash()).isEqualTo("newHash");
        verify(userRepository).save(principal);
        verify(refreshTokenRepository).revokeAllActiveByUser(eq(principal), any(OffsetDateTime.class));
    }
}
