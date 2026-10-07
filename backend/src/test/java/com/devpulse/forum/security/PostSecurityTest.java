package com.devpulse.forum.security;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.repository.PostRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostSecurityTest {

    @Mock private PostRepository postRepository;
    @InjectMocks private PostSecurity postSecurity;

    private static Authentication auth(String username, String... roles) {
        return new UsernamePasswordAuthenticationToken(username, "n/a", AuthorityUtils.createAuthorityList(roles));
    }

    private void postBy(String username) {
        User author = User.builder().id(1L).username(username).role(Role.USER).build();
        when(postRepository.findBySlug("hello")).thenReturn(Optional.of(Post.builder().slug("hello").author(author).build()));
    }

    @Test
    void anonymousIsDenied() {
        Authentication anonymous = new AnonymousAuthenticationToken(
                "key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS"));

        assertThat(postSecurity.canModify("hello", null)).isFalse();
        assertThat(postSecurity.canModify("hello", anonymous)).isFalse();
    }

    @Test
    void adminAndModeratorAreAllowedWithoutLookup() {
        assertThat(postSecurity.canModify("hello", auth("root", "ROLE_ADMIN"))).isTrue();
        assertThat(postSecurity.canModify("hello", auth("mod", "ROLE_MODERATOR"))).isTrue();
        verifyNoInteractions(postRepository);
    }

    @Test
    void authorIsAllowed() {
        postBy("alice");

        assertThat(postSecurity.canModify("hello", auth("alice", "ROLE_USER"))).isTrue();
    }

    @Test
    void otherUserIsDenied() {
        postBy("alice");

        assertThat(postSecurity.canModify("hello", auth("bob", "ROLE_USER"))).isFalse();
    }

    @Test
    void unknownSlugIsLeftToTheServiceToAnswer404() {
        when(postRepository.findBySlug("ghost")).thenReturn(Optional.empty());

        assertThat(postSecurity.canModify("ghost", auth("bob", "ROLE_USER"))).isTrue();
    }
}
