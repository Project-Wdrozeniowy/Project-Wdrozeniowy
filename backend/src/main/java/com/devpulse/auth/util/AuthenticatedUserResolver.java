package com.devpulse.auth.util;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Helper that resolves the currently authenticated {@link User} entity from
 * the Spring Security context.
 *
 * <p>Centralising this lookup keeps controllers and services free of
 * Spring Security plumbing and ensures consistent error handling when the
 * principal is missing or has been deleted between requests.
 */
@Component
@RequiredArgsConstructor
public class AuthenticatedUserResolver {

    private final UserRepository userRepository;

    /**
     * Returns the entity behind the current security context.
     *
     * @return the authenticated {@link User}
     * @throws AppException HTTP 401 if no principal is bound to the thread,
     *                      or HTTP 404 if the principal no longer exists in the DB
     */
    public User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AppException("Not authenticated", HttpStatus.UNAUTHORIZED);
        }
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("Authenticated user not found", HttpStatus.NOT_FOUND));
    }
}
