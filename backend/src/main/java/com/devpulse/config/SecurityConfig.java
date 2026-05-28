package com.devpulse.config;

import com.devpulse.auth.filter.JwtAuthenticationFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
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
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Main Spring Security configuration.
 *
 * <p>The application is stateless (REST API + JWT), therefore:
 * <ul>
 *   <li>CSRF is disabled — session cookies are not used.</li>
 *   <li>Session management is set to STATELESS — Spring does not create an HttpSession.</li>
 *   <li>Every request is authenticated via {@link JwtAuthenticationFilter}.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    /** Filter that reads and validates the JWT from the Authorization header. */
    private final JwtAuthenticationFilter jwtAuthFilter;

    /** Service that loads a user from the database by username. */
    private final UserDetailsService userDetailsService;

    /** Shared Jackson mapper used to serialise RFC 9457 ProblemDetail responses. */
    private final ObjectMapper objectMapper;

    /**
     * Defines the HTTP security filter chain.
     *
     * <ul>
     *   <li>{@code /auth/**} — public endpoints (registration, login, token refresh).</li>
     *   <li>All other endpoints require a valid JWT.</li>
     * </ul>
     *
     * @param http the Spring Security configuration object
     * @return the configured {@link SecurityFilterChain}
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
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint(problemDetailAuthenticationEntryPoint())
                        .accessDeniedHandler(problemDetailAccessDeniedHandler()))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /**
     * Entry point used when the filter chain rejects a request because the
     * caller is unauthenticated. Without this bean Spring Security would emit
     * an empty 403 — instead we surface an RFC 9457 ProblemDetail with the
     * same shape as {@code com.devpulse.exception.GlobalExceptionHandler}.
     */
    @Bean
    public AuthenticationEntryPoint problemDetailAuthenticationEntryPoint() {
        return (request, response, authException) ->
                writeProblemDetail(response, HttpStatus.UNAUTHORIZED, "Authentication failed");
    }

    /**
     * Handler used when an authenticated principal lacks the authority for the
     * requested resource and the rejection happens inside the filter chain
     * (before MVC dispatch). Returns the same ProblemDetail body as the MVC
     * {@code AccessDeniedException} handler.
     */
    @Bean
    public AccessDeniedHandler problemDetailAccessDeniedHandler() {
        return (request, response, accessDeniedException) ->
                writeProblemDetail(response, HttpStatus.FORBIDDEN, "Access is denied");
    }

    private void writeProblemDetail(HttpServletResponse response,
                                    HttpStatus status,
                                    String detail) throws java.io.IOException {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(status.getReasonPhrase());
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), pd);
    }

    /**
     * Database-backed authentication provider.
     *
     * <p>In Spring Security 6.3+ the {@code DaoAuthenticationProvider} constructor
     * accepts {@link UserDetailsService} directly — the
     * {@code setUserDetailsService} method was removed from the API.
     *
     * @return the configured {@link DaoAuthenticationProvider}
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * Exposes the {@link AuthenticationManager} as a Spring bean.
     * Used in {@link com.devpulse.auth.service.AuthService}
     * to verify credentials during login.
     *
     * @param config the authentication configuration provided by Spring
     * @return the global {@link AuthenticationManager}
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * BCrypt-based password encoder.
     * Used during registration (hashing) and login (verification).
     *
     * @return an instance of {@link BCryptPasswordEncoder}
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
