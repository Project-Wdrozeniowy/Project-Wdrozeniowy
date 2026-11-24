package com.devpulse.config;

import com.devpulse.websocket.security.WsSessionAccess;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** SockJS HTTP authentication is read-only; CONNECT supplies CSRF. REST security is unchanged. */
@Configuration
@RequiredArgsConstructor
public class WsSecurityConfig {
    private final WsSessionAccess sessions;
    private final SecurityConfig errors;
    @Bean @Order(1)
    SecurityFilterChain wsSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher("/ws", "/ws/**")
                .csrf(AbstractHttpConfigurer::disable)
                .securityContext(sc -> sc.securityContextRepository(new RequestAttributeSecurityContextRepository()))
                // This filter reads an already authenticated JDBC principal. It is not a new login and
                // must not invoke fixation/invalid-session strategies on each SockJS request.
                .sessionManagement(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable).httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                .exceptionHandling(eh -> eh.authenticationEntryPoint(errors.problemDetailAuthenticationEntryPoint())
                        .accessDeniedHandler(errors.problemDetailAccessDeniedHandler()))
                .addFilterBefore(new OncePerRequestFilter() {
                    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                            FilterChain chain) throws ServletException, IOException {
                        var access = sessions.read(request);
                        if (access != null) {
                            request.setAttribute(WsSessionAccess.ATTRIBUTE, access);
                            SecurityContextHolder.getContext().setAuthentication(access.authentication());
                        }
                        chain.doFilter(request, response);
                    }
                }, AnonymousAuthenticationFilter.class).build();
    }
}
