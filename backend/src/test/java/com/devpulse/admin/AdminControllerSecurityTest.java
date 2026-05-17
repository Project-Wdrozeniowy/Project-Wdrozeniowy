package com.devpulse.admin;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for {@link com.devpulse.admin.controller.AdminController}
 * verifying role-based authorization on admin-only endpoints.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    /** Anonymous request must be rejected with 401 by the JWT filter chain. */
    @Test
    void anonymousIsUnauthorized() throws Exception {
        mockMvc.perform(get("/admin/ping"))
                .andExpect(status().isUnauthorized());
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
