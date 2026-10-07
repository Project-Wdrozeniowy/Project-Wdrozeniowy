package com.devpulse.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Errors raised by Spring MVC itself, before or around a controller call,
 * keep their 4xx/5xx status and come back as RFC 9457 ProblemDetail instead of
 * being reported as an unexpected 500.
 */
@SpringBootTest
@ActiveProfiles("test")
class GlobalExceptionHandlerWebTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void malformedJsonIs400() throws Exception {
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"username\":"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void wrongQueryParameterTypeIs400() throws Exception {
        mockMvc.perform(get("/forum/posts").param("page", "first"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void unsupportedContentTypeIs415() throws Exception {
        mockMvc.perform(post("/auth/login").contentType(MediaType.TEXT_PLAIN).content("alice"))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void unsupportedMethodIs405() throws Exception {
        mockMvc.perform(delete("/auth/login"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void unknownPathIs404() throws Exception {
        mockMvc.perform(get("/no-such-endpoint").with(user("alice")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void responseStatusExceptionKeepsItsStatus() throws Exception {
        // Contract stubs throw ResponseStatusException(NOT_IMPLEMENTED).
        mockMvc.perform(get("/forum/categories"))
                .andExpect(status().isNotImplemented())
                .andExpect(jsonPath("$.status").value(501));
    }
}
