package com.devpulse.websocket;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.session.SessionPrincipal;
import com.devpulse.support.MigratedSchemaTest;
import com.devpulse.websocket.security.WsSessionAccess;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.session.web.http.SessionRepositoryFilter;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@MigratedSchemaTest
class WsHttpSessionIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired SessionRepositoryFilter<?> filter;
    @Autowired SessionRepository<?> repository;
    @Autowired WsSessionAccess access;

    @Test @SuppressWarnings("unchecked")
    void sockJsHttpTrafficDoesNotTouchRotateOrDeleteTheActualJdbcSession() throws Exception {
        var sessions = (SessionRepository<Session>) repository;
        var user = users.saveAndFlush(User.builder().username("e2e_ws_" + UUID.randomUUID())
                .email(UUID.randomUUID() + "@example.test").passwordHash("synthetic").build());
        var principal = new SessionPrincipal(user.getId(), user.getUsername(), 0, Instant.now());
        var security = SecurityContextHolder.createEmptyContext();
        security.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of()));
        var session = sessions.createSession();
        session.setAttribute("SPRING_SECURITY_CONTEXT", security);
        session.setLastAccessedTime(Instant.now().minusSeconds(120));
        session.setMaxInactiveInterval(Duration.ofHours(1));
        sessions.save(session);
        String id = session.getId();
        Instant lastAccess = sessions.findById(id).getLastAccessedTime();
        var mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(filter).apply(springSecurity()).build();
        try {
            var cookie = new Cookie("SESSION", Base64.getEncoder().encodeToString(id.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            for (int i = 0; i < 2; i++) {
                mvc.perform(get("/ws/info").cookie(cookie)).andExpect(status().isOk());
                assertThat(sessions.findById(id)).isNotNull();
                assertThat(sessions.findById(id).getLastAccessedTime()).isEqualTo(lastAccess);
                assertThat(access.read(id, principal)).isNotNull();
            }
        } finally { sessions.deleteById(id); users.deleteById(user.getId()); }
    }
}
