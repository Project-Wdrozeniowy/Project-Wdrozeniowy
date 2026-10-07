package com.devpulse.forum.security;

import com.devpulse.forum.entity.Post;
import com.devpulse.forum.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Authorization helper invoked from {@code @PreAuthorize} expressions to check
 * whether the current principal may modify a given {@link Post}.
 *
 * <p>A caller is allowed when they are the author of the post or forum staff
 * (moderator or admin, see {@link ForumAuthorities#isStaff}).
 */
@Component("postSecurity")
@RequiredArgsConstructor
public class PostSecurity {

    private final PostRepository postRepository;

    /**
     * @param slug           slug of the post being acted on
     * @param authentication current Spring Security authentication
     * @return {@code true} if the caller is the author or forum staff. Also
     *         {@code true} for an unknown slug, so the service answers 404
     *         instead of a misleading 403.
     */
    public boolean canModify(String slug, Authentication authentication) {
        if (!ForumAuthorities.isAuthenticated(authentication)) {
            return false;
        }
        if (ForumAuthorities.isStaff(authentication)) {
            return true;
        }
        return postRepository.findBySlug(slug)
                .map(post -> post.getAuthor().getUsername().equals(authentication.getName()))
                .orElse(true);
    }
}
