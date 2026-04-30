package com.devpulse.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI (Swagger) configuration for REST API documentation.
 *
 * <p>Configures:
 * <ul>
 *   <li>API metadata: title, version, description.</li>
 *   <li>Bearer JWT authentication scheme — allows requests to secured
 *       endpoints directly from Swagger UI.</li>
 *   <li>Tag ordering — defines the display order in Swagger UI.</li>
 * </ul>
 *
 * <p>The global {@code SecurityRequirement} is intentionally omitted here.
 * Only endpoints annotated with {@code @SecurityRequirement(name = "bearerAuth")}
 * will show the lock icon, keeping public endpoints clearly marked as open.
 *
 * <p>Swagger UI is available at {@code /swagger-ui/index.html} after startup.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("DevPulse API")
                        .version("1.0.0")
                        .description("REST API for the DevPulse platform"))
                // Explicit tag order determines display order in Swagger UI
                .tags(List.of(
                        new Tag().name("Auth").description("Registration, login, token management"),
                        new Tag().name("Users").description("User profile endpoints"),
                        new Tag().name("Forum \u2013 Categories").description("Browse and manage forum categories"),
                        new Tag().name("Forum \u2013 Posts").description("Browse and manage forum posts"),
                        new Tag().name("Forum \u2013 Comments").description("Read and manage comments on forum posts"),
                        new Tag().name("Forum \u2013 Tags").description("Browse tags and tag-filtered posts"),
                        new Tag().name("Forum \u2013 Votes").description("Cast and retract votes on posts and comments"),
                        new Tag().name("Notifications").description("Manage user notifications"),
                        new Tag().name("Analytics").description("Activity and engagement analytics"),
                        new Tag().name("Recommendations").description("Content recommendations based on activity and trends")
                ))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
