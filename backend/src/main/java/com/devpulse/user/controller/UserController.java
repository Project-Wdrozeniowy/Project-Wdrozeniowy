package com.devpulse.user.controller;

import com.devpulse.user.dto.ChangePasswordRequest;
import com.devpulse.user.dto.ProfileResponse;
import com.devpulse.user.dto.PublicProfileResponse;
import com.devpulse.user.dto.UpdateProfileRequest;
import com.devpulse.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller exposing user profile endpoints.
 *
 * <p>All {@code /users/me} routes require an authenticated principal —
 * authorization is enforced by the default JWT filter chain in
 * {@link com.devpulse.config.SecurityConfig}. The lookup-by-username
 * route ({@code GET /users/{username}}) is publicly accessible — no JWT required.
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Returns the caller's full profile.
     *
     * @return {@link ProfileResponse}; HTTP 200
     */
    @GetMapping("/me")
    public ProfileResponse currentProfile() {
        return userService.getCurrentProfile();
    }

    /**
     * Updates the caller's profile fields (PATCH semantics).
     *
     * @param request validated profile updates
     * @return the updated profile; HTTP 200
     */
    @PatchMapping("/me")
    public ProfileResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(request);
    }

    /**
     * Changes the caller's password. On success all active refresh tokens
     * for the user are invalidated, forcing re-login on every device.
     *
     * @param request current and new password
     */
    @PostMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request);
    }

    /**
     * Returns the publicly visible profile for the given username.
     *
     * @param username the username to look up
     * @return {@link PublicProfileResponse}; HTTP 200
     */
    @GetMapping("/{username}")
    public PublicProfileResponse publicProfile(@PathVariable String username) {
        return userService.getPublicProfile(username);
    }
}
