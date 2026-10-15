package com.devpulse.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * OpenAPI (Swagger) configuration for REST API documentation.
 *
 * <p>The published document describes only implemented operations. Controllers
 * whose operations still answer {@code 501 Not Implemented} are annotated with
 * {@code @Hidden}; their annotations stay as the design reference for the Jira
 * task that implements them. {@link OpenApiContractCustomizer} adds what
 * springdoc cannot derive, and {@code backend/openapi.json} is a committed copy
 * of the generated document that {@code OpenApiContractTest} keeps in sync.
 *
 * <p>Configures:
 * <ul>
 *   <li>API metadata: title, version, description.</li>
 *   <li>The server URL, relative so the document is the same whichever host
 *       serves it: the backend itself or the gateway, both under {@code /api}.</li>
 *   <li>Bearer JWT authentication scheme — allows requests to secured
 *       endpoints directly from Swagger UI.</li>
 *   <li>Tags and their display order in Swagger UI.</li>
 * </ul>
 *
 * <p>The global {@code SecurityRequirement} is intentionally omitted here.
 * Only endpoints annotated with {@code @SecurityRequirement(name = "bearerAuth")}
 * will show the lock icon, keeping public endpoints clearly marked as open.
 *
 * <p>Swagger UI is available at {@code /api/swagger-ui/index.html} when
 * {@code SWAGGER_ENABLED=true}.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("Orbita API")
                        .version("1.0.0")
                        .description("REST API of the Orbita forum platform. Lists only implemented operations; "
                                + "planned ones are tracked in Jira."))
                .servers(List.of(new Server().url("/api")))
                .tags(new ArrayList<>(tags()))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }

    /**
     * Tags of the published operations in display order. springdoc lists tags
     * in the order it discovers the controllers, so {@link OpenApiContractCustomizer}
     * restores this one; the tag of a newly published controller goes after
     * these, by name.
     */
    static List<Tag> tags() {
        return List.of(
                new Tag().name("Auth").description("Registration, login, token management"),
                new Tag().name("Users").description("User profile endpoints"),
                new Tag().name("Forum \u2013 Posts").description("Browse and manage forum posts"),
                new Tag().name("Admin").description("Administration endpoints, ADMIN role only")
        );
    }
}
