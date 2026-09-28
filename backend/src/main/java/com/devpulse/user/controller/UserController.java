package com.devpulse.user.controller;

import com.devpulse.user.dto.UpdateProfileRequest;
import com.devpulse.user.dto.UserProfileDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Tag(name = "Users", description = "User profile endpoints")
@RestController
@RequestMapping("/users")
public class UserController {

    @Operation(summary = "Get public profile by username")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile found"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{username}")
    public UserProfileDto getUserProfile(
            @Parameter(description = "Username", example = "johndoe") @PathVariable String username) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Get own profile", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile returned"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/me")
    public UserProfileDto getMyProfile() {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Update own profile", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile updated"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PatchMapping("/me")
    public UserProfileDto updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }
}
