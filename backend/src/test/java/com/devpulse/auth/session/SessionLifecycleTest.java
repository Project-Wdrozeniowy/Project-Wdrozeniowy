package com.devpulse.auth.session;

import com.devpulse.auth.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.MapSession;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.*;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SessionLifecycleTest {
    @SuppressWarnings("unchecked")
    private final FindByIndexNameSessionRepository<MapSession> repository = mock(FindByIndexNameSessionRepository.class);
    private final HttpSessionCsrfTokenRepository csrf = new HttpSessionCsrfTokenRepository();
    private final HttpSessionSecurityContextRepository contexts = new HttpSessionSecurityContextRepository();
    private final Instant now = Instant.parse("2026-11-08T10:00:00Z");
    private final SessionLifecycle lifecycle = new SessionLifecycle(repository, mock(JdbcTemplate.class), csrf, contexts,
            Clock.fixed(now, ZoneOffset.UTC));
    private final MockHttpServletRequest request = new MockHttpServletRequest();
    private final MockHttpServletResponse response = new MockHttpServletResponse();

    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void authenticationCreatesANewSessionAndDropsTheOldCsrfToken() {
        prepare();
        String oldId = request.getSession().getId();
        var oldToken = csrf.generateToken(request); csrf.saveToken(oldToken, request, response);
        when(repository.findById(oldId)).thenReturn(new MapSession(oldId));
        var user = User.builder().id(1L).username("alice").passwordHash("secret hash").authVersion(5).build();
        lifecycle.establish(user, request, response);
        assertThat(request.getSession().getId()).isNotEqualTo(oldId);
        assertThat(csrf.loadToken(request)).isNull();
        assertThat(request.getSession().getMaxInactiveInterval()).isEqualTo(3600);
        var authentication = contexts.loadDeferredContext(request).get().getAuthentication();
        assertThat(authentication.getCredentials()).isNull();
        assertThat(authentication.getPrincipal()).isEqualTo(new SessionPrincipal(1L, "alice", 5, now));
    }

    @Test void staleAuthenticationCannotCreateANewSessionAfterRevocation() {
        prepare();
        assertThatThrownBy(() -> lifecycle.establish(User.builder().build(), request, response))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test void logoutAlsoDeletesAReplacementFromTheSameBrowserButNotAnotherDevice() {
        prepare();
        String browser = (String) request.getSession().getAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME);
        when(repository.findByIndexNameAndIndexValue(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME, browser))
                .thenReturn(Map.of("replacement", new MapSession("replacement")));
        lifecycle.logout(request, response);
        verify(repository).deleteById("replacement");
        verify(repository, never()).deleteById("another-device");
        assertThat(request.getSession(false)).isNull();
        assertThat(response.getHeaders("Set-Cookie")).anyMatch(value -> value.startsWith("SESSION=") && value.contains("Max-Age=0"));
    }

    @Test void absentSessionLogoutDoesNotCreateOne() {
        ReflectionTestUtils.setField(lifecycle, "legacyPath", "/api/auth");
        lifecycle.logout(request, response);
        assertThat(request.getSession(false)).isNull();
        verifyNoInteractions(repository);
    }

    @Test void bootstrapReusesTheExistingBrowserContextAndClearsTheConfiguredLegacyPath() {
        prepare();
        Object browser = request.getSession().getAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME);
        lifecycle.prepare(request, response);
        assertThat(request.getSession().getAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME)).isEqualTo(browser);
        assertThat(response.getHeader("Set-Cookie")).contains("refreshToken=", "Path=/api/auth", "Max-Age=0");
        assertThat(request.getSession().getMaxInactiveInterval()).isEqualTo(900);
    }

    private void prepare() {
        ReflectionTestUtils.setField(lifecycle, "legacyPath", "/api/auth");
        lifecycle.prepare(request, response);
    }
}
