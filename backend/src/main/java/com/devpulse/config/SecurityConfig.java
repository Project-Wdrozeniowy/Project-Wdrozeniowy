package com.devpulse.config;

import com.orbit.auth.filter.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Основная конфигурация Spring Security.
 *
 * <p>Приложение работает без состояния (REST API + JWT), поэтому:
 * <ul>
 *   <li>CSRF отключён — сессионные cookie не используются.</li>
 *   <li>Управление сессиями установлено в STATELESS — Spring не создаёт HttpSession.</li>
 *   <li>Каждый запрос аутентифицируется через {@link JwtAuthenticationFilter}.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    /** Фильтр, считывающий и валидирующий JWT из заголовка Authorization. */
    private final JwtAuthenticationFilter jwtAuthFilter;

    /** Сервис, загружающий пользователя из базы данных по имени. */
    private final UserDetailsService userDetailsService;

    /**
     * Определяет цепочку фильтров безопасности HTTP.
     *
     * <ul>
     *   <li>{@code /auth/**} — публичные эндпоинты (регистрация, вход, обновление токена).</li>
     *   <li>Остальные эндпоинты требуют действительного JWT.</li>
     * </ul>
     *
     * @param http объект конфигурации Spring Security
     * @return настроенный {@link SecurityFilterChain}
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /**
     * Провайдер аутентификации на основе базы данных.
     *
     * <p>В Spring Security 6.3+ конструктор {@code DaoAuthenticationProvider}
     * принимает {@link UserDetailsService} напрямую — метод
     * {@code setUserDetailsService} был удалён из API.
     *
     * @return настроенный {@link DaoAuthenticationProvider}
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * Предоставляет {@link AuthenticationManager} как бин Spring.
     * Используется в {@link com.orbit.auth.service.AuthService}
     * для проверки учётных данных при входе.
     *
     * @param config конфигурация аутентификации, предоставляемая Spring
     * @return глобальный {@link AuthenticationManager}
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Кодировщик паролей на основе алгоритма BCrypt.
     * Используется при регистрации (хэширование) и входе (верификация).
     *
     * @return экземпляр {@link BCryptPasswordEncoder}
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
