package com.devpulse.websocket.security;

import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.session.SessionPrincipal;
import com.devpulse.auth.session.SessionValidityFilter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.stereotype.Component;
import java.time.Clock;

/** Reads the existing SESSION. Never creates, touches or saves an HttpSession. */
@Component
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class WsSessionAccess {
    public static final String ATTRIBUTE = WsSessionAccess.class.getName();
    private final FindByIndexNameSessionRepository<? extends Session> sessions;
    private final CookieSerializer cookies;
    private final UserRepository users;
    private final Clock clock;
    public record Access(String sessionId, SessionPrincipal principal, Authentication authentication, CsrfToken csrf) {}

    public Access read(HttpServletRequest request) {
        var ids = cookies.readCookieValues(request);
        return ids.size() == 1 ? read(ids.get(0), null) : null;
    }
    public Access read(String id, SessionPrincipal expected) {
        Session session = sessions.findById(id);
        if (session == null) { log.warn("Notification session absent"); return null; }
        if (!clock.instant().isBefore(session.getLastAccessedTime().plus(session.getMaxInactiveInterval()))) {
            log.warn("Notification session idle"); return null;
        }
        Object saved = session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        if (!(saved instanceof SecurityContext context) || context.getAuthentication() == null
                || !context.getAuthentication().isAuthenticated()
                || !(context.getAuthentication().getPrincipal() instanceof SessionPrincipal principal)
                || (expected != null && !expected.equals(principal))) { log.warn("Notification session identity mismatch"); return null; }
        Authentication authentication = SessionValidityFilter.currentAuthentication(principal, users, clock);
        if (authentication == null) { log.warn("Notification account invalid"); return null; }
        CsrfToken csrf = session.getAttribute(HttpSessionCsrfTokenRepository.class.getName() + ".CSRF_TOKEN");
        return new Access(id, principal, authentication, csrf);
    }
}
