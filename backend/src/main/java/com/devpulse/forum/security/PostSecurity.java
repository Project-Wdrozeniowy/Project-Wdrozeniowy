package com.devpulse.forum.security;

import com.devpulse.forum.entity.Post;
import com.devpulse.forum.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

/**
 * Authorization helper invoked from {@code @PreAuthorize} expressions to check
 * whether the current principal may modify a given {@link Post}.
 *
 * <p>A caller is allowed when any of the following holds:
 * <ul>
 *   <li>they are the original author of the post,</li>
 *   <li>they hold the {@code ADMIN} role, or</li>
 *   <li>they hold the {@code MODERATOR} role.</li>
 * </ul>
 */
@Component("postSecurity")
@RequiredArgsConstructor
public class PostSecurity {

    private final PostRepository postRepository;

    /**
     * @param postId         identifier of the post being acted on
     * @param authentication current Spring Security authentication
     * @return {@code true} if the caller is the author or part of forum staff
     */
    public boolean isAuthorOrStaff(Long postId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        if (hasRole(authentication, "ROLE_ADMIN") || hasRole(authentication, "ROLE_MODERATOR")) {
            return true;
        }
        return postRepository.findById(postId)
                .map(Post::getAuthor)
                .map(author -> author.getUsername().equals(authentication.getName()))
                .orElse(false);
    }

    private static boolean hasRole(Authentication authentication, String role) {
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (role.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
