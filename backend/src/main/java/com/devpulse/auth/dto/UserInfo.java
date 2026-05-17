package com.devpulse.auth.dto;

import com.devpulse.auth.entity.User;

/**
 * Lightweight user representation returned alongside authentication responses.
 *
 * <p>Included in {@link AuthResponse} so the client can display the authenticated
 * user's information immediately after login, register, or session restore,
 * without making a separate {@code GET /auth/me} call.
 */
public record UserInfo(String id, String username, String email, String role) {

    public static UserInfo from(User user) {
        return new UserInfo(
                user.getId().toString(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().name()
        );
    }
}
