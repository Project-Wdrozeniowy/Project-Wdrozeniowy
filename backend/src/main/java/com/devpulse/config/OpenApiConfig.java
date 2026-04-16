package com.devpulse.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI (Swagger) configuration for REST API documentation.
 *
 * <p>Configures:
 * <ul>
 *   <li>API metadata: title, version, description.</li>
 *   <li>Bearer JWT authentication scheme — allows requests to secured
 *       endpoints directly from Swagger UI.</li>
 * </ul>
 *
 * <p>Swagger UI is available at {@code /swagger-ui/index.html} after startup.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Creates an {@link OpenAPI} instance with project metadata and JWT auth scheme.
     *
     * @return configured {@link OpenAPI} instance
     */
    @Bean
    public OpenAPI openAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("DevPulse API")
                        .version("1.0.0")
                        .description("REST API for the DevPulse platform"))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
