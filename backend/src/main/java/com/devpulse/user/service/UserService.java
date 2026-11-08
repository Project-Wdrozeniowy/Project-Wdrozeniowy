package com.devpulse.user.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.exception.AppException;
import com.devpulse.user.dto.ChangePasswordRequest;
import com.devpulse.user.dto.MyProfileDto;
import com.devpulse.user.dto.UpdateProfileRequest;
import com.devpulse.user.dto.UserProfileDto;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Business logic for user profile management.
 *
 * <p>Covers reading the caller's own profile, updating mutable profile fields,
 * changing the password and exposing a sanitised public profile by username.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    /** The {@code errors.email} message of the 409 for an address another account uses. */
    static final String EMAIL_TAKEN_MESSAGE = "Email is already used by another account";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticatedUserResolver currentUser;
    private final jakarta.persistence.EntityManager entityManager;

    /**
     * Returns the full profile of the currently authenticated user.
     *
     * @return the caller's profile
     */
    @Transactional(readOnly = true)
    public MyProfileDto getCurrentProfile() {
        return MyProfileDto.from(currentUser.currentUser());
    }

    /**
     * Returns the public-facing profile for the given username.
     *
     * @param username the username to look up
     * @return the public profile
     * @throws AppException HTTP 404 if no such user exists
     */
    @Transactional(readOnly = true)
    public UserProfileDto getPublicProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
        return UserProfileDto.from(user);
    }

    /**
     * Updates mutable profile fields of the authenticated user.
     *
     * <p>PATCH semantics: fields that are {@code null} in the request stay as
     * they are. An empty string clears {@code displayName}, {@code avatarUrl}
     * or {@code bio}; a blank email never gets here, request validation
     * rejects it. Email changes are checked for uniqueness; the unique
     * constraint on {@code users.email} catches the race between that check
     * and the update, so a concurrent request for the same address also ends
     * in 409 instead of a 500. The 409 names the {@code email} field.
     *
     * @param request fields to update
     * @return the updated profile
     * @throws AppException HTTP 409 if the new email is already registered
     */
    @Transactional
    public MyProfileDto updateProfile(UpdateProfileRequest request) {
        User user = currentUser.currentUser();

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw emailTaken();
            }
            user.setEmail(request.getEmail());
        }
        if (request.getDisplayName() != null) {
            user.setDisplayName(blankToNull(request.getDisplayName()));
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(blankToNull(request.getAvatarUrl()));
        }
        if (request.getBio() != null) {
            user.setBio(blankToNull(request.getBio()));
        }

        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw emailTaken();
        }
        return MyProfileDto.from(user);
    }

    /**
     * Changes the authenticated user's password.
     *
     * <p>Verifies the current password using BCrypt, hashes the new one and
     * revokes every prior server session for the user so all sessions
     * must re-authenticate.
     *
     * @param request the current and new password
     * @throws AppException HTTP 400 if the current password does not match
     */
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = userRepository.lockById(currentUser.currentUser().getId())
                .orElseThrow(() -> new AppException("Not authenticated", HttpStatus.UNAUTHORIZED));
        entityManager.refresh(user);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new AppException("Current password is incorrect", HttpStatus.BAD_REQUEST);
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setAuthVersion(user.getAuthVersion() + 1);
        userRepository.save(user);

        // Version comparison rejects all prior sessions, even a session saved after this transaction.
    }

    private static AppException emailTaken() {
        return new AppException("Email already registered", HttpStatus.CONFLICT,
                Map.of("email", EMAIL_TAKEN_MESSAGE));
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
