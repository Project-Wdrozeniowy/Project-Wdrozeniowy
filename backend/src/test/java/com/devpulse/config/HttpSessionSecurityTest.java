package com.devpulse.config;

import com.devpulse.admin.controller.AdminController;
import com.devpulse.auth.controller.AuthController;
import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.service.AuthService;
import com.devpulse.auth.session.SessionLifecycle;
import com.devpulse.auth.session.SessionPrincipal;
import com.devpulse.exception.GlobalExceptionHandler;
import com.devpulse.user.controller.UserController;
import com.devpulse.user.service.UserService;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real HTTP security configuration with mocked business collaborators; no database or JDBC evidence. */
class HttpSessionSecurityTest {
    static AnnotationConfigWebApplicationContext context;
    MockMvc mvc;
    UserRepository users;
    static final Instant NOW = Instant.parse("2026-11-08T10:00:00Z");

    @BeforeAll static void start() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(SecurityTestConfiguration.class);
        context.refresh();
    }
    @AfterAll static void stop() { context.close(); }
    @BeforeEach void setUp() {
        users = context.getBean(UserRepository.class);
        reset(users, context.getBean(AuthService.class));
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test void safePublicPrivateAndUnknownMethodsHaveDistinctOutcomes() throws Exception {
        mvc.perform(get("/users/alice")).andExpect(status().isOk());
        mvc.perform(head("/users/alice")).andExpect(status().isOk());
        mvc.perform(get("/users/me")).andExpect(status().isUnauthorized());
        mvc.perform(head("/users/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/users/me/subscriptions")).andExpect(status().isUnauthorized());
        mvc.perform(get("/not-implemented")).andExpect(status().isNotFound());
        mvc.perform(post("/users/alice").with(csrf())).andExpect(status().isMethodNotAllowed());
    }

    @Test void csrfPrecedesAuthenticationAndNeverReplaysAWrite() throws Exception {
        mvc.perform(post("/users/me/password").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden()).andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        mvc.perform(post("/users/me/password").with(csrf()).contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"username\":\"alice\",\"password\":\"password123\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(context.getBean(AuthService.class));
        mvc.perform(post("/auth/login").with(csrf()).contentType("application/json")
                .content("{\"username\":\"alice\",\"password\":\"password123\"}"))
                .andExpect(status().isNoContent());
        verify(context.getBean(AuthService.class), times(1)).login(any(), any(), any());
    }

    @Test void bearerAndChosenCookieCannotReplaceAnAuthenticatedSession() throws Exception {
        mvc.perform(get("/users/me").header("Authorization", "Bearer legacy")
                .cookie(new jakarta.servlet.http.Cookie("SESSION", "attacker-chosen")))
                .andExpect(status().isUnauthorized());
    }

    @Test void sockJsTransportDoesNotBecomePublicThroughTheUnknownMvcRoutePolicy() throws Exception {
        mvc.perform(get("/ws/info")).andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        mvc.perform(post("/ws/000/synthetic/xhr").with(csrf())).andExpect(status().isUnauthorized());
        when(users.findById(1L)).thenReturn(Optional.of(User.builder().id(1L).username("alice").build()));
        // The actual SockJS info handler remains reachable for an authenticated HTTP session.
        // Established connection, CONNECT and destination security remain PWDRZ-104.
        mvc.perform(get("/ws/info").session(authenticated())).andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"));
    }

    @Test void spaCanUseTheActualJsonCsrfTokenWithTheSameSession() throws Exception {
        var bootstrap = mvc.perform(get("/auth/csrf")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store")).andReturn();
        String token = com.jayway.jsonpath.JsonPath.read(bootstrap.getResponse().getContentAsString(), "$.token");
        var session = (MockHttpSession) bootstrap.getRequest().getSession(false);
        mvc.perform(post("/auth/login").session(session).header("X-CSRF-TOKEN", token)
                .contentType("application/json").content("{\"username\":\"alice\",\"password\":\"password123\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(post("/auth/logout").session(session).header("X-CSRF-TOKEN", "wrong"))
                .andExpect(status().isForbidden());
    }

    @Test void actualRoleChecksUseCurrentAccountStateInsteadOfSerializedAuthorities() throws Exception {
        var user = User.builder().id(1L).username("alice").role(Role.USER).build();
        when(users.findById(1L)).thenReturn(Optional.of(user));
        mvc.perform(get("/admin/ping").session(authenticated()))
                .andExpect(status().isForbidden());
        user.setRole(Role.ADMIN);
        mvc.perform(get("/admin/ping").session(authenticated()))
                .andExpect(status().isOk());
        user.setAuthVersion(1);
        mvc.perform(get("/admin/ping").session(authenticated()))
                .andExpect(status().isUnauthorized());
    }

    private MockHttpSession authenticated() {
        var security = SecurityContextHolder.createEmptyContext();
        security.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                new SessionPrincipal(1L, "alice", 0, NOW), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        var session = new MockHttpSession();
        session.setAttribute("SPRING_SECURITY_CONTEXT", security);
        return session;
    }

    @TestConfiguration
    @EnableWebMvc
    @Import({SecurityConfig.class, WebSocketConfig.class, AuthController.class, UserController.class,
            AdminController.class, GlobalExceptionHandler.class})
    static class SecurityTestConfiguration {
        @Bean UserRepository users() { return mock(UserRepository.class); }
        @Bean AuthService auth() { return mock(AuthService.class); }
        @Bean SessionLifecycle sessions() { return mock(SessionLifecycle.class); }
        @Bean UserService userService() { return mock(UserService.class); }
        @Bean com.devpulse.websocket.interceptor.WebSocketAuthInterceptor wsAuthentication() {
            return mock(com.devpulse.websocket.interceptor.WebSocketAuthInterceptor.class);
        }
        @Bean Clock clock() { return Clock.fixed(NOW, ZoneOffset.UTC); }
        @Bean UserDetailsService userDetails() { return username -> org.springframework.security.core.userdetails.User
                .withUsername(username).password("unused").roles("USER").build(); }
    }
}
