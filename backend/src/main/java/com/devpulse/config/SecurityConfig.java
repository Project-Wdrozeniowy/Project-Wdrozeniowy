package com.devpulse.config;

import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.session.SessionValidityFilter;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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

import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import java.time.Clock;

import java.io.IOException;
import java.net.URI;

/** Cookie session authentication, session-backed CSRF and resource authorization. */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String[] PUBLIC_READS = {
            "/auth/csrf", "/forum/categories", "/forum/categories/*",
            "/forum/posts", "/forum/posts/*", "/forum/posts/*/comments", "/forum/tags",
            "/search", "/analytics/trending-posts", "/analytics/public/activity", "/analytics/public/categories",
            "/analytics/public/comparison",
            "/recommendations/posts", "/recommendations/tags"
    };

    /** Account state is checked before session authentication is used. */
    private final UserRepository users;
    private final Clock sessionClock;

    /** Service that loads a user from the database by username. */
    private final UserDetailsService userDetailsService;

    /**
     * Jackson mapper used to serialise RFC 9457 ProblemDetail bodies written
     * directly from the security filter chain. A dedicated instance is used
     * instead of injecting one — the auto-configured web mapper is not
     * guaranteed to be on the classpath in this build. Null members are
     * omitted so the body matches what MVC produces for the same ProblemDetail.
     */
    private final ObjectMapper problemDetailObjectMapper =
            new ObjectMapper().setSerializationInclusion(JsonInclude.Include.NON_NULL);

    /**
     * Defines the HTTP security filter chain.
     *
     * <ul>
     *   <li>{@code /auth/**} — public endpoints (registration, login, logout).</li>
     *   <li>Other implemented protected endpoints require a valid session.</li>
     * </ul>
     *
     * @param http the Spring Security configuration object
     * @return the configured {@link SecurityFilterChain}
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
            @Qualifier("requestMappingHandlerMapping") ObjectProvider<RequestMappingHandlerMapping> mappings) throws Exception {
        return http
                .csrf(csrf -> csrf.csrfTokenRepository(csrfTokenRepository()))
                .securityContext(sc -> sc.securityContextRepository(securityContextRepository()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .requestCache(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, PUBLIC_READS).permitAll()
                        .requestMatchers(HttpMethod.HEAD, PUBLIC_READS).permitAll()
                        // Auth operations are public but always require CSRF;
                        // logout invalidates only the current browser context
                        .requestMatchers(HttpMethod.POST, "/auth/login", "/auth/register", "/auth/logout").permitAll()
                        // Guests open posts too; the CSRF check still applies.
                        .requestMatchers(HttpMethod.POST, "/forum/posts/*/openings").permitAll()
                        // Private /me takes precedence over the public username route.
                        .requestMatchers(HttpMethod.GET, "/users/me").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/users/me").authenticated()
                        .requestMatchers("/users/me/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/users/*").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/users/*").permitAll()
                        // SockJS uses a separate HandlerMapping, not MVC controller mappings.
                        // Preserve its authenticated HTTP boundary; full WS security remains PWDRZ-104.
                        .requestMatchers("/ws", "/ws/**").authenticated()
                        // OpenAPI / Swagger UI
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        // Everything else requires session authentication; fine-grained role checks via @PreAuthorize
                        .anyRequest().access((authentication, context) -> {
                            // Preserve MVC 404/405 without opening a newly implemented controller.
                            try {
                                if (mappings.getObject().getHandler(context.getRequest()) == null) {
                                    return new AuthorizationDecision(true);
                                }
                            } catch (HttpRequestMethodNotSupportedException e) {
                                return new AuthorizationDecision(true);
                            } catch (Exception e) {
                                throw new IllegalStateException("Cannot resolve API access policy", e);
                            }
                            var caller = authentication.get();
                            return new AuthorizationDecision(caller != null && caller.isAuthenticated()
                                    && !(caller instanceof org.springframework.security.authentication.AnonymousAuthenticationToken));
                        })
                )
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint(problemDetailAuthenticationEntryPoint())
                        .accessDeniedHandler(problemDetailAccessDeniedHandler()))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(new SessionValidityFilter(users, sessionClock), CsrfFilter.class)
                .build();
    }

    @Bean
    public HttpSessionCsrfTokenRepository csrfTokenRepository() {
        return new HttpSessionCsrfTokenRepository();
    }

    @Bean
    public HttpSessionSecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
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
                writeProblemDetail(request, response, HttpStatus.UNAUTHORIZED, "Authentication failed");
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
                writeProblemDetail(request, response, HttpStatus.FORBIDDEN, "Access is denied");
    }

    private void writeProblemDetail(HttpServletRequest request,
                                    HttpServletResponse response,
                                    HttpStatus status,
                                    String detail) throws IOException {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(status.getReasonPhrase());
        pd.setInstance(URI.create(request.getRequestURI()));
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        problemDetailObjectMapper.writeValue(response.getOutputStream(), pd);
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
