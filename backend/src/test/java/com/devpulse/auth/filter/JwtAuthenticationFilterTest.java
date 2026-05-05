package com.devpulse.auth.filter;

import com.devpulse.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private UserDetailsService userDetailsService;

    @InjectMocks
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void noAuthorizationHeader_passesRequestThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void authorizationHeaderWithoutBearerPrefix_passesRequestThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic dXNlcjpwYXNz");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void bearerTokenWithInvalidJwt_passesRequestThroughWithoutAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer not.a.valid.token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        when(jwtUtil.extractUsername("not.a.valid.token"))
                .thenThrow(new RuntimeException("Malformed JWT"));

        filter.doFilterInternal(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void validBearerToken_setsAuthenticationInSecurityContext() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer valid.jwt.token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        UserDetails ud = org.springframework.security.core.userdetails.User
                .withUsername("alice")
                .password("hashed")
                .authorities(Collections.emptyList())
                .build();

        when(jwtUtil.extractUsername("valid.jwt.token")).thenReturn("alice");
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(ud);
        when(jwtUtil.isTokenValid("valid.jwt.token", ud)).thenReturn(true);

        filter.doFilterInternal(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName())
                .isEqualTo("alice");
    }

    @Test
    void bearerTokenFailsValidation_doesNotSetAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer expired.jwt.token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        UserDetails ud = org.springframework.security.core.userdetails.User
                .withUsername("alice")
                .password("hashed")
                .authorities(Collections.emptyList())
                .build();

        when(jwtUtil.extractUsername("expired.jwt.token")).thenReturn("alice");
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(ud);
        when(jwtUtil.isTokenValid("expired.jwt.token", ud)).thenReturn(false);

        filter.doFilterInternal(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void alreadyAuthenticated_skipsTokenValidationAndPassesThrough() throws Exception {
        // Pre-set an existing authentication in the context
        org.springframework.security.core.Authentication existing =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        "alice", null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(existing);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer some.jwt.token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        when(jwtUtil.extractUsername("some.jwt.token")).thenReturn("alice");

        filter.doFilterInternal(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
        // Still the same authentication object
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isEqualTo(existing);
    }
}
