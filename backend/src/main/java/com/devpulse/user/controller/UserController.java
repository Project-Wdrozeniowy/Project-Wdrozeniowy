package com.devpulse.user.controller;

import com.devpulse.user.dto.ChangePasswordRequest;
import com.devpulse.user.dto.MyProfileDto;
import com.devpulse.user.dto.UpdateProfileRequest;
import com.devpulse.user.dto.UserProfileDto;
import com.devpulse.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Users", description = "User profile endpoints")
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Returns the caller's full profile.
     *
     * @return {@link MyProfileDto}; HTTP 200
     */
    @Operation(summary = "Get own profile", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile returned"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/me")
    public MyProfileDto currentProfile() {
        return userService.getCurrentProfile();
    }

    /**
     * Updates the caller's profile fields (PATCH semantics).
     *
     * @param request validated profile updates
     * @return the updated profile; HTTP 200
     */
    @Operation(summary = "Update own profile", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile updated"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "409", description = "Email already registered")
    })
    @PatchMapping("/me")
    public MyProfileDto updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(request);
    }

    /**
     * Changes the caller's password. On success all active refresh tokens
     * for the user are invalidated, forcing re-login on every device.
     *
     * @param request current and new password
     */
    @Operation(summary = "Change own password", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Password changed"),
        @ApiResponse(responseCode = "400", description = "Validation error or wrong current password"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PostMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request);
    }

    /**
     * Returns the publicly visible profile for the given username.
     *
     * @param username the username to look up
     * @return {@link UserProfileDto}; HTTP 200
     */
    @Operation(summary = "Get public profile by username")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile found"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{username}")
    public UserProfileDto publicProfile(
            @Parameter(description = "Username", example = "johndoe") @PathVariable String username) {
        return userService.getPublicProfile(username);
    }
}
