package com.devpulse.auth.session;

import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.List;

/** Checks persisted session/account validity before CSRF and resource authorization. */
@RequiredArgsConstructor
public class SessionValidityFilter extends OncePerRequestFilter {
    private final UserRepository users;
    private final Clock clock;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof SessionPrincipal principal) {
            var user = users.findById(principal.userId()).orElse(null);
            boolean valid = user != null && user.getStatus() == UserStatus.ACTIVE
                    && user.getAuthVersion() == principal.authVersion()
                    && principal.authenticatedAt() != null
                    && clock.instant().isBefore(principal.authenticatedAt().plus(Duration.ofHours(12)));
            if (!valid) {
                if (request.getSession(false) != null) request.getSession(false).invalidate();
                SecurityContextHolder.clearContext();
            } else {
                var current = SecurityContextHolder.createEmptyContext();
                current.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(principal, null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))));
                SecurityContextHolder.setContext(current);
            }
        }
        chain.doFilter(request, response);
    }
}
