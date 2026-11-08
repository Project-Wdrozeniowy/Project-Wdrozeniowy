package com.devpulse.auth.session;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SessionValidityFilterTest {
    private final Instant now = Instant.parse("2026-11-08T10:00:00Z");
    private final UserRepository users = mock(UserRepository.class);
    private final SessionValidityFilter filter = new SessionValidityFilter(users, Clock.fixed(now, ZoneOffset.UTC));
    private final MockHttpServletRequest request = new MockHttpServletRequest();
    private final MockHttpServletResponse response = new MockHttpServletResponse();
    private final User user = User.builder().id(1L).username("alice").passwordHash("never in principal").build();

    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void authenticationImmediatelyBeforeAbsoluteDeadlineIsValid() throws Exception {
        authenticate(now.minus(Duration.ofHours(12)).plusMillis(1), 0);
        when(users.findById(1L)).thenReturn(Optional.of(user));
        execute();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test void authenticationAtAbsoluteDeadlineIsInvalidatedBeforeTheHandler() throws Exception {
        authenticate(now.minus(Duration.ofHours(12)), 0);
        when(users.findById(1L)).thenReturn(Optional.of(user));
        execute();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(request.getSession(false)).isNull();
    }

    @Test void revokedVersionCannotBeRestoredByASavedSessionContext() throws Exception {
        authenticate(now.minusSeconds(1), 0);
        user.setAuthVersion(1);
        when(users.findById(1L)).thenReturn(Optional.of(user));
        execute();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @ParameterizedTest
    @EnumSource(value = UserStatus.class, names = {"BANNED", "DEACTIVATED"})
    void inactiveAccountCannotContinueAuthenticatedUse(UserStatus status) throws Exception {
        authenticate(now, 0); user.setStatus(status);
        when(users.findById(1L)).thenReturn(Optional.of(user));
        execute();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test void deletedAccountBecomesGuest() throws Exception {
        authenticate(now, 0);
        execute();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test void changedRolesReplaceTheOldAuthoritySnapshotWithoutResettingAuthenticationTime() throws Exception {
        authenticate(now.minusSeconds(5), 0); user.setRole(Role.USER);
        when(users.findById(1L)).thenReturn(Optional.of(user));
        execute();
        var current = SecurityContextHolder.getContext().getAuthentication();
        assertThat(current.getAuthorities()).extracting("authority").containsExactly("ROLE_USER");
        assertThat(((SessionPrincipal) current.getPrincipal()).authenticatedAt()).isEqualTo(now.minusSeconds(5));
        assertThat(current.getCredentials()).isNull();
    }

    @Test void guestReadDoesNotCreateASessionOrQueryAnAccount() throws Exception {
        execute();
        assertThat(request.getSession(false)).isNull();
        verifyNoInteractions(users);
    }

    @Test void storeFailureIsNotReportedAsConfirmedGuest() {
        authenticate(now, 0);
        when(users.findById(1L)).thenThrow(new IllegalStateException("database unavailable"));
        assertThatThrownBy(this::execute).isInstanceOf(IllegalStateException.class);
    }

    private void authenticate(Instant at, long version) {
        request.getSession();
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                new SessionPrincipal(1L, "alice", version, at), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }
    private void execute() throws Exception {
        filter.doFilter(request, response, (req, res) -> {});
    }
}
