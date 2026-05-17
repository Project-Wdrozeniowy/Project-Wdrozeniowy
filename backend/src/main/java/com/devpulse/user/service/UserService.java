package com.devpulse.user.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.RefreshTokenRepository;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.exception.AppException;
import com.devpulse.user.dto.ChangePasswordRequest;
import com.devpulse.user.dto.ProfileResponse;
import com.devpulse.user.dto.PublicProfileResponse;
import com.devpulse.user.dto.UpdateProfileRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Business logic for user profile management.
 *
 * <p>Covers reading the caller's own profile, updating mutable profile fields,
 * changing the password and exposing a sanitised public profile by username.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticatedUserResolver currentUser;

    /**
     * Returns the full profile of the currently authenticated user.
     *
     * @return the caller's profile
     */
    @Transactional(readOnly = true)
    public ProfileResponse getCurrentProfile() {
        return ProfileResponse.from(currentUser.currentUser());
    }

    /**
     * Returns the public-facing profile for the given username.
     *
     * @param username the username to look up
     * @return the public profile
     * @throws AppException HTTP 404 if no such user exists
     */
    @Transactional(readOnly = true)
    public PublicProfileResponse getPublicProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));
        return PublicProfileResponse.from(user);
    }

    /**
     * Updates mutable profile fields of the authenticated user.
     *
     * <p>Only non-{@code null} fields in the request are applied — the endpoint
     * follows PATCH semantics. Email changes are validated for uniqueness.
     *
     * @param request fields to update
     * @return the updated profile
     * @throws AppException HTTP 409 if the new email is already registered
     */
    @Transactional
    public ProfileResponse updateProfile(UpdateProfileRequest request) {
        User user = currentUser.currentUser();

        if (StringUtils.hasText(request.getEmail()) && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new AppException("Email already registered", HttpStatus.CONFLICT);
            }
            user.setEmail(request.getEmail());
        }
        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }

        userRepository.save(user);
        return ProfileResponse.from(user);
    }

    /**
     * Changes the authenticated user's password.
     *
     * <p>Verifies the current password using BCrypt, hashes the new one and
     * invalidates every existing refresh token for the user so all sessions
     * must re-authenticate.
     *
     * @param request the current and new password
     * @throws AppException HTTP 400 if the current password does not match
     */
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = currentUser.currentUser();

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new AppException("Current password is incorrect", HttpStatus.BAD_REQUEST);
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Force re-login on every active device by removing existing refresh tokens.
        refreshTokenRepository.deleteAllByUser(user);
    }
}
