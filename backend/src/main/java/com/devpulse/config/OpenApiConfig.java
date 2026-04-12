package com.devpulse.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Конфигурация OpenAPI (Swagger) для документирования REST API.
 *
 * <p>Настраивает:
 * <ul>
 *   <li>Метаданные API: название, версия, описание.</li>
 *   <li>Схему аутентификации Bearer JWT — позволяет выполнять запросы
 *       к защищённым эндпоинтам прямо из Swagger UI.</li>
 * </ul>
 *
 * <p>Swagger UI доступен по адресу {@code /swagger-ui/index.html} после запуска приложения.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Создаёт объект {@link OpenAPI} с описанием проекта и схемой JWT-аутентификации.
     *
     * @return настроенный экземпляр {@link OpenAPI}
     */
    @Bean
    public OpenAPI openAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("Orbit API")
                        .version("1.0.0")
                        .description("REST API социальной платформы Orbit"))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
