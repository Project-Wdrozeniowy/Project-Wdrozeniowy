package com.devpulse.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "Logout request — revoke the given refresh token")
public class LogoutRequest {

    @NotBlank
    @Schema(description = "Refresh token to revoke", example = "a1b2c3d4...")
    private String refreshToken;
}
