package com.devpulse.websocket;

import com.devpulse.auth.entity.*;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.session.SessionPrincipal;
import com.devpulse.websocket.security.WsSessionAccess;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.session.*;
import org.springframework.session.web.http.CookieSerializer;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class WsSessionAccessTest {
    final Instant now = Instant.parse("2026-11-24T10:00:00Z");
    @SuppressWarnings("unchecked") final FindByIndexNameSessionRepository<MapSession> repository = mock(FindByIndexNameSessionRepository.class);
    final CookieSerializer cookies = mock(CookieSerializer.class);
    final UserRepository users = mock(UserRepository.class);
    final WsSessionAccess access = new WsSessionAccess(repository, cookies, users, Clock.fixed(now, ZoneOffset.UTC));
    final MapSession session = new MapSession("id");
    final User user = User.builder().id(1L).username("alice").build();
    final SessionPrincipal principal = new SessionPrincipal(1L, "alice", 0, now.minusSeconds(10));

    void authenticated() {
        session.setLastAccessedTime(now.minusSeconds(20));
        session.setMaxInactiveInterval(Duration.ofHours(1));
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of()));
        session.setAttribute("SPRING_SECURITY_CONTEXT", context);
        when(repository.findById("id")).thenReturn(session);
        when(users.findById(1L)).thenReturn(Optional.of(user));
    }
    @Test void readsExistingIdentityWithoutTouchingOrSavingTheSession() {
        authenticated();
        var request = new MockHttpServletRequest();
        when(cookies.readCookieValues(request)).thenReturn(List.of("id"));
        assertThat(access.read(request).principal()).isEqualTo(principal);
        assertThat(session.getLastAccessedTime()).isEqualTo(now.minusSeconds(20));
        assertThat(request.getSession(false)).isNull();
        verify(repository, never()).save(any());
        when(cookies.readCookieValues(request)).thenReturn(List.of(), List.of("id", "other"));
        assertThat(access.read(request)).isNull();
        assertThat(access.read(request)).isNull();
    }
    @Test void missingGuestExpiredReplacedAndRevokedSessionsFail() {
        assertThat(access.read("id", null)).isNull();
        authenticated();
        assertThat(access.read("id", new SessionPrincipal(2L, "bob", 0, now))).isNull();
        session.setLastAccessedTime(now.minus(Duration.ofHours(1)));
        assertThat(access.read("id", principal)).isNull();
        session.setLastAccessedTime(now);
        user.setAuthVersion(1);
        assertThat(access.read("id", principal)).isNull();
        session.removeAttribute("SPRING_SECURITY_CONTEXT");
        assertThat(access.read("id", null)).isNull();
    }
    @Test void storeFailureIsNotConfirmedGuest() {
        when(repository.findById("id")).thenThrow(new IllegalStateException("unavailable"));
        assertThatThrownBy(() -> access.read("id", null)).isInstanceOf(IllegalStateException.class);
    }
}
