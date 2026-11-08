package com.devpulse.auth.session;

import com.devpulse.auth.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.session.SessionFixationProtectionStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfLogoutHandler;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

/** Reuses Spring's fixation/context/logout lifecycle. No second session or credential store. */
@Service
@RequiredArgsConstructor
public class SessionLifecycle {
    private final FindByIndexNameSessionRepository<? extends Session> sessions;
    private final JdbcTemplate jdbc;
    private final HttpSessionCsrfTokenRepository csrf;
    private final HttpSessionSecurityContextRepository contexts;
    private final Clock clock;
    @Value("${app.session-cookie.secure:true}") private boolean secure;
    @Value("${app.legacy-cookie.path:/api/auth}") private String legacyPath;

    /** Internal browser lineage is an index in the standard session store, never a browser credential. */
    public void prepare(HttpServletRequest request, HttpServletResponse response) {
        var session = request.getSession();
        if (session.getAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME) == null) {
            session.setAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME,
                    "browser:" + UUID.randomUUID());
            session.setMaxInactiveInterval(900);
        }
        clearLegacyCookie(response);
    }

    /** Caller holds the user lock; both repository writes and this lock use the same transaction. */
    public void establish(User user, HttpServletRequest request, HttpServletResponse response) {
        String browser = lockBrowser(request);
        var previous = request.getSession(false);
        if (previous == null || sessions.findById(previous.getId()) == null) {
            throw new AccessDeniedException("Session changed; obtain a new CSRF token");
        }
        var principal = new SessionPrincipal(user.getId(), user.getUsername(), user.getAuthVersion(), clock.instant());
        var authentication = UsernamePasswordAuthenticationToken.authenticated(principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
        // A new row prevents an old request's save from undoing session-ID rotation.
        var fixation = new SessionFixationProtectionStrategy();
        fixation.setMigrateSessionAttributes(true);
        fixation.onAuthentication(authentication, request, response);
        request.getSession().setAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME, browser);
        request.getSession().setMaxInactiveInterval(3600);
        new CsrfAuthenticationStrategy(csrf).onAuthentication(authentication, request, response);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        clearLegacyCookie(response);
    }

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        if (request.getSession(false) != null) {
            String browser = lockBrowser(request);
            // Includes a replacement row committed by a concurrent login after this request loaded its old session.
            sessions.findByIndexNameAndIndexValue(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME, browser)
                    .keySet().forEach(sessions::deleteById);
        }
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        new CsrfLogoutHandler(csrf).logout(request, response, authentication);
        var logout = new SecurityContextLogoutHandler();
        logout.setSecurityContextRepository(contexts);
        logout.logout(request, response, authentication);
        clearCookie(response, "SESSION", "/");
        clearLegacyCookie(response);
    }

    private String lockBrowser(HttpServletRequest request) {
        var session = request.getSession(false);
        Object browser = session == null ? null
                : session.getAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME);
        if (!(browser instanceof String value) || !value.startsWith("browser:")) {
            throw new AccessDeniedException("Obtain a CSRF token before authentication");
        }
        // Only authentication/logout transitions lock; normal HTTP requests are not serialized.
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?, 99))", rs -> {}, value);
        return value;
    }

    public void clearLegacyCookie(HttpServletResponse response) {
        clearCookie(response, "refreshToken", legacyPath);
    }

    private void clearCookie(HttpServletResponse response, String name, String path) {
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(name, "").path(path)
                .httpOnly(true).secure(secure).sameSite("Strict").maxAge(Duration.ZERO).build().toString());
    }
}
