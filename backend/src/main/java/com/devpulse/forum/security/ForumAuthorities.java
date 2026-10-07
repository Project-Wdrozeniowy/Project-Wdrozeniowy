package com.devpulse.forum.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

/**
 * Role checks shared by the forum services and their {@code @PreAuthorize}
 * helpers.
 *
 * <p>"Staff" means moderators and admins: they moderate any post (edit,
 * delete, lock, pin). Drafts stay private to their author and admins.
 */
public final class ForumAuthorities {

    private ForumAuthorities() {
    }

    /** {@code true} for a real, non-anonymous principal. */
    public static boolean isAuthenticated(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
    }

    /** {@code true} for moderators and admins. */
    public static boolean isStaff(Authentication authentication) {
        return hasRole(authentication, "ROLE_MODERATOR") || isAdmin(authentication);
    }

    /** {@code true} for admins. */
    public static boolean isAdmin(Authentication authentication) {
        return hasRole(authentication, "ROLE_ADMIN");
    }

    /** {@code true} if the authenticated principal is the user with {@code username}. */
    public static boolean isUser(Authentication authentication, String username) {
        return isAuthenticated(authentication) && authentication.getName().equals(username);
    }

    private static boolean hasRole(Authentication authentication, String role) {
        if (!isAuthenticated(authentication)) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (role.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
