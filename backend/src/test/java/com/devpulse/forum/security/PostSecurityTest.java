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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostSecurityTest {

    @Mock private PostRepository postRepository;
    @InjectMocks private PostSecurity postSecurity;

    private static Authentication auth(String username, String... roles) {
        List<SimpleGrantedAuthority> authorities = java.util.Arrays.stream(roles)
                .map(SimpleGrantedAuthority::new).toList();
        return new UsernamePasswordAuthenticationToken(username, "n/a", authorities);
    }

    @Test
    void anonymousIsDenied() {
        assertThat(postSecurity.isAuthorOrStaff(1L, null)).isFalse();
    }

    @Test
    void adminIsAlwaysAllowed() {
        assertThat(postSecurity.isAuthorOrStaff(1L, auth("root", "ROLE_ADMIN"))).isTrue();
    }

    @Test
    void moderatorRoleDoesNotGrantAccess() {
        // ROLE_MODERATOR isn't a real role in the auth system (only USER/ADMIN exist),
        // so an authority with that name must not be treated as staff.
        User author = User.builder().id(1L).username("alice").role(Role.USER).build();
        Post post = Post.builder().id(1L).author(author).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));

        assertThat(postSecurity.isAuthorOrStaff(1L, auth("mod", "ROLE_MODERATOR"))).isFalse();
    }

    @Test
    void authorIsAllowed() {
        User author = User.builder().id(1L).username("alice").role(Role.USER).build();
        Post post = Post.builder().id(1L).author(author).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));

        assertThat(postSecurity.isAuthorOrStaff(1L, auth("alice", "ROLE_USER"))).isTrue();
    }

    @Test
    void otherUserIsDenied() {
        User author = User.builder().id(1L).username("alice").role(Role.USER).build();
        Post post = Post.builder().id(1L).author(author).build();
        when(postRepository.findById(1L)).thenReturn(Optional.of(post));

        assertThat(postSecurity.isAuthorOrStaff(1L, auth("bob", "ROLE_USER"))).isFalse();
    }

    @Test
    void missingPostIsDenied() {
        when(postRepository.findById(99L)).thenReturn(Optional.empty());

        assertThat(postSecurity.isAuthorOrStaff(99L, auth("alice", "ROLE_USER"))).isFalse();
    }
}
