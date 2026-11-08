package com.devpulse.auth.controller;

import com.devpulse.support.MigratedSchemaTest;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockCookie;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Actual Spring Session filter, CSRF and Flyway/PostgreSQL. Deferred at the user's development-time request. */
@MigratedSchemaTest
class AuthCookieFlowTest {
    @Autowired WebApplicationContext context;
    @Autowired org.springframework.session.jdbc.JdbcIndexedSessionRepository repository;
    MockMvc mvc;
    final Map<String, Cookie> cookies = new HashMap<>();
    String csrf;

    @BeforeEach void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSessionRepositoryFilter", Filter.class))
                .apply(springSecurity()).build();
        cookies.clear();
    }

    @Test void registerBootstrapLogoutAndLegacyCredentials() throws Exception {
        csrf();
        String username = "session-" + UUID.randomUUID().toString().substring(0, 8);
        String oldCookie = cookies.get("SESSION").getValue();
        var registered = send(post("/auth/register").contentType("application/json")
                .content("{\"username\":\"" + username + "\",\"email\":\"" + username
                        + "@example.test\",\"password\":\"Password123!\"}"), true);
        assertThat(registered.getStatus()).isEqualTo(201);
        assertThat(registered.getContentAsString()).isEmpty();
        assertThat(cookies.get("SESSION").getValue()).isNotEqualTo(oldCookie);
        assertThat(registered.getHeaders("Set-Cookie")).anyMatch(value -> value.startsWith("SESSION=")
                && value.contains("Path=/") && value.contains("HttpOnly") && value.contains("SameSite=Strict")
                && !value.contains("Max-Age") && !value.contains("Expires") && !value.contains("Domain="));
        assertThat(send(get("/users/me"), false).getStatus()).isEqualTo(200);
        // Authentication renewed CSRF. The previous token cannot authorize logout.
        assertThat(send(post("/auth/logout"), true).getStatus()).isEqualTo(403);
        csrf();
        Cookie authenticated = cookies.get("SESSION");
        assertThat(send(post("/auth/logout"), true).getStatus()).isEqualTo(204);
        mvc.perform(get("/users/me").cookie(authenticated)).andExpect(status().isUnauthorized());
        mvc.perform(get("/users/me").header("Authorization", "Bearer legacy")
                .cookie(new Cookie("refreshToken", "legacy"))).andExpect(status().isUnauthorized());
        csrf();
        assertThat(send(post("/auth/logout"), true).getStatus()).isEqualTo(204);
    }

    @Test void csrfIsRequiredEvenForPublicAuthentication() throws Exception {
        mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"username\":\"alice\",\"password\":\"password\"}"))
                .andExpect(status().isForbidden()).andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        mvc.perform(get("/forum/posts").cookie(new Cookie("SESSION", "attacker-chosen")))
                .andExpect(status().isOk());
        mvc.perform(get("/users/me/subscriptions")).andExpect(status().isUnauthorized());
    }

    @Test void independentSessionsSurviveAnotherDevicesLogoutAndPasswordChangeRevokesBoth() throws Exception {
        String username = register();
        Cookie first = cookies.get("SESSION");
        cookies.clear();
        login(username, "Password123!");
        Cookie second = cookies.get("SESSION");
        csrf();
        assertThat(send(post("/auth/logout"), true).getStatus()).isEqualTo(204);
        mvc.perform(get("/users/me").cookie(first)).andExpect(status().isOk());
        mvc.perform(get("/users/me").cookie(second)).andExpect(status().isUnauthorized());

        login(username, "Password123!");
        second = cookies.get("SESSION");
        csrf();
        assertThat(send(post("/users/me/password").contentType("application/json")
                .content("{\"currentPassword\":\"WrongPassword!\",\"newPassword\":\"Replacement123!\"}"), true)
                .getStatus()).isEqualTo(400);
        mvc.perform(get("/users/me").cookie(first)).andExpect(status().isOk());
        assertThat(send(post("/users/me/password").contentType("application/json")
                .content("{\"currentPassword\":\"Password123!\",\"newPassword\":\"Replacement123!\"}"), true)
                .getStatus()).isEqualTo(204);
        mvc.perform(get("/users/me").cookie(first)).andExpect(status().isUnauthorized());
        mvc.perform(get("/users/me").cookie(second)).andExpect(status().isUnauthorized());
        csrf();
        assertThat(send(post("/auth/login").contentType("application/json")
                .content(credentials(username, "Password123!")), true).getStatus()).isEqualTo(401);
        login(username, "Replacement123!");
    }

    @Test void persistedAbsoluteDeadlineSurvivesCsrfRenewalAndIdleExpiryNeedsNoCleanup() throws Exception {
        register();
        Cookie authenticated = cookies.get("SESSION");
        String id = new String(Base64.getDecoder().decode(authenticated.getValue()), java.nio.charset.StandardCharsets.UTF_8);
        var session = persistedSessions().findById(id);
        var security = (org.springframework.security.core.context.SecurityContext) session.getAttribute("SPRING_SECURITY_CONTEXT");
        var prior = (com.devpulse.auth.session.SessionPrincipal) security.getAuthentication().getPrincipal();
        var at = java.time.Instant.now().minus(java.time.Duration.ofHours(12)).plusSeconds(60);
        security.setAuthentication(org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(
                new com.devpulse.auth.session.SessionPrincipal(prior.userId(), prior.username(), prior.authVersion(), at),
                null, security.getAuthentication().getAuthorities()));
        session.setAttribute("SPRING_SECURITY_CONTEXT", security);
        persistedSessions().save(session);
        assertThat(send(get("/users/me"), false).getStatus()).isEqualTo(200);
        csrf();
        session = persistedSessions().findById(id);
        security = session.getAttribute("SPRING_SECURITY_CONTEXT");
        assertThat(((com.devpulse.auth.session.SessionPrincipal) security.getAuthentication().getPrincipal()).authenticatedAt()).isEqualTo(at);
        security.setAuthentication(org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(
                new com.devpulse.auth.session.SessionPrincipal(prior.userId(), prior.username(), prior.authVersion(),
                        java.time.Instant.now().minus(java.time.Duration.ofHours(12))),
                null, security.getAuthentication().getAuthorities()));
        session.setAttribute("SPRING_SECURITY_CONTEXT", security);
        persistedSessions().save(session);
        mvc.perform(get("/users/me").cookie(authenticated)).andExpect(status().isUnauthorized());

        cookies.clear();
        login(prior.username(), "Password123!");
        authenticated = cookies.get("SESSION");
        id = new String(Base64.getDecoder().decode(authenticated.getValue()), java.nio.charset.StandardCharsets.UTF_8);
        session = persistedSessions().findById(id);
        session.setLastAccessedTime(java.time.Instant.now().minusSeconds(3601));
        persistedSessions().save(session);
        mvc.perform(get("/users/me").cookie(authenticated)).andExpect(status().isUnauthorized());
        mvc.perform(get("/forum/posts").cookie(authenticated)).andExpect(status().isOk());
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private org.springframework.session.SessionRepository<org.springframework.session.Session> persistedSessions() {
        return (org.springframework.session.SessionRepository) repository;
    }

    private String register() throws Exception {
        csrf();
        String username = "session-" + UUID.randomUUID().toString().substring(0, 8);
        assertThat(send(post("/auth/register").contentType("application/json")
                .content("{\"username\":\"" + username + "\",\"email\":\"" + username
                        + "@example.test\",\"password\":\"Password123!\"}"), true).getStatus()).isEqualTo(201);
        return username;
    }

    private void login(String username, String password) throws Exception {
        csrf();
        assertThat(send(post("/auth/login").contentType("application/json")
                .content(credentials(username, password)), true).getStatus()).isEqualTo(204);
        assertThat(send(get("/users/me"), false).getStatus()).isEqualTo(200);
    }

    private String credentials(String username, String password) {
        return "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
    }

    private void csrf() throws Exception {
        var response = send(get("/auth/csrf"), false);
        assertThat(response.getStatus()).isEqualTo(200);
        csrf = JsonPath.read(response.getContentAsString(), "$.token");
    }
    private MockHttpServletResponse send(MockHttpServletRequestBuilder request, boolean unsafe) throws Exception {
        request.cookie(cookies.values().toArray(Cookie[]::new));
        if (unsafe) request.header("X-CSRF-TOKEN", csrf);
        var response = mvc.perform(request).andReturn().getResponse();
        for (String header : response.getHeaders("Set-Cookie")) {
            var cookie = MockCookie.parse(header);
            if (cookie.getMaxAge() == 0) cookies.remove(cookie.getName());
            else cookies.put(cookie.getName(), cookie);
        }
        return response;
    }
}
