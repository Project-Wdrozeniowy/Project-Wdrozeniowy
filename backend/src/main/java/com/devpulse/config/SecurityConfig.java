package com.devpulse.config;

import com.devpulse.auth.filter.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
                        .requestMatchers(HttpMethod.GET, "/users/*").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
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
