package com.devpulse.admin;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for {@link com.devpulse.admin.controller.AdminController}
 * verifying role-based authorization on admin-only endpoints.
 *
 * <p>MockMvc is wired manually from the {@link WebApplicationContext} so the
 * test does not depend on the {@code @AutoConfigureMockMvc} annotation,
 * which lives in a separate module under Spring Boot 4 and is not part of
 * {@code spring-boot-starter-test} in this build.
 */
@SpringBootTest
@ActiveProfiles("test")
class AdminControllerSecurityTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    /**
     * Anonymous request is rejected with 401 and the RFC 9457 ProblemDetail
     * body produced by the configured {@code AuthenticationEntryPoint}.
     */
    @Test
    void anonymousIsUnauthorized() throws Exception {
        mockMvc.perform(get("/admin/ping"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"));
    }

    /** A standard USER must be rejected with 403 by {@code @PreAuthorize}. */
    @Test
    @WithMockUser(username = "alice", roles = "USER")
    void standardUserIsForbidden() throws Exception {
        mockMvc.perform(get("/admin/ping"))
                .andExpect(status().isForbidden());
    }

    /** A MODERATOR is also rejected with 403 — admin scope is strictly ADMIN. */
    @Test
    @WithMockUser(username = "mod", roles = "MODERATOR")
    void moderatorIsForbidden() throws Exception {
        mockMvc.perform(get("/admin/ping"))
                .andExpect(status().isForbidden());
    }

    /** An ADMIN receives 200 and the expected payload. */
    @Test
    @WithMockUser(username = "root", roles = "ADMIN")
    void adminGetsOk() throws Exception {
        mockMvc.perform(get("/admin/ping"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.scope").value("admin"));
    }
}
