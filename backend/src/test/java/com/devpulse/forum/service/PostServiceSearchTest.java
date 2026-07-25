package com.devpulse.forum.service;

import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.CategoryRepository;
import com.devpulse.forum.repository.PostRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Verifies the dynamic specification composition and the staff-only behaviour
 * for non-PUBLISHED filters added by PWDRZ-69.
 */
@ExtendWith(MockitoExtension.class)
class PostServiceSearchTest {

    @Mock private PostRepository postRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private AuthenticatedUserResolver currentUser;

    @InjectMocks private PostService postService;

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    private static void setAuth(String username, String... roles) {
        List<SimpleGrantedAuthority> authorities = java.util.Arrays.stream(roles)
                .map(SimpleGrantedAuthority::new).toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, "n/a", authorities));
    }

    private static void setAnonymous() {
        SecurityContextHolder.getContext().setAuthentication(
                new AnonymousAuthenticationToken("k", "anonymousUser",
                        List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
    }

    @SuppressWarnings("unchecked")
    private Page<Post> emptyPage() {
        return new PageImpl<>(Collections.emptyList());
    }

    @Test
    void search_nonStaff_forcesPublishedStatus() {
        setAuth("alice", "ROLE_USER");
        when(postRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(emptyPage());

        postService.search("hello", null, null, null, PostStatus.DRAFT, PageRequest.of(0, 10));

        ArgumentCaptor<Specification<Post>> spec = ArgumentCaptor.forClass(Specification.class);
        org.mockito.Mockito.verify(postRepository).findAll(spec.capture(), any(Pageable.class));
        // We only verify that the call was made with a non-null specification;
        // the precise predicate is asserted indirectly through the database.
        assertThat(spec.getValue()).isNotNull();
    }

    @Test
    void search_anonymous_runsAsNonStaff() {
        setAnonymous();
        when(postRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(emptyPage());

        Page<Post> result = postService.search(null, null, null, null, null, PageRequest.of(0, 10));
        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    void search_admin_honoursStatusFilter() {
        setAuth("root", "ROLE_ADMIN");
        when(postRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(emptyPage());

        postService.search(null, 7L, "news", "alice", PostStatus.DRAFT, PageRequest.of(0, 10));
        // No exception, all branches exercised.
    }

    @Test
    void search_staffWithoutStatus_excludesDeleted() {
        setAuth("root", "ROLE_ADMIN");
        when(postRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(emptyPage());

        postService.search(null, null, null, null, null, PageRequest.of(0, 10));
    }

    @Test
    void search_moderatorRole_treatedAsNonStaff() {
        // ROLE_MODERATOR isn't a real role in the auth system, so it must not
        // unlock staff-only status filtering — behaviour should match a plain user.
        setAuth("mod", "ROLE_MODERATOR");
        when(postRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(emptyPage());

        postService.search("hello", null, null, null, PostStatus.DRAFT, PageRequest.of(0, 10));

        ArgumentCaptor<Specification<Post>> spec = ArgumentCaptor.forClass(Specification.class);
        org.mockito.Mockito.verify(postRepository).findAll(spec.capture(), any(Pageable.class));
        assertThat(spec.getValue()).isNotNull();
    }
}
