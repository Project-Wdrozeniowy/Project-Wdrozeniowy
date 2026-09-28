package com.devpulse.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.URL;

@Getter
@NoArgsConstructor
@Schema(description = "Request body for updating own profile (all fields optional)")
public class UpdateProfileRequest {

    @Size(max = 100)
    @Schema(description = "New display name")
    private String displayName;

    @URL
    @Size(max = 500)
    @Schema(description = "New avatar URL — must be a valid HTTP/HTTPS URL")
    private String avatarUrl;

    @Size(max = 1000)
    @Schema(description = "New bio text")
    private String bio;
}
