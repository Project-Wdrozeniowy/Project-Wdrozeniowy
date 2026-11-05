package com.devpulse.exception;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
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

    @Autowired
    private GlobalExceptionHandler exceptionHandler;

    @Autowired
    private AccessDeniedHandler accessDeniedHandler;

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
        MockMvc stubMvc = MockMvcBuilders.standaloneSetup(new StubController())
                .setControllerAdvice(exceptionHandler)
                .build();

        stubMvc.perform(get("/stub"))
                .andExpect(status().isNotImplemented())
                .andExpect(jsonPath("$.status").value(501));
    }

    /**
     * An exception no handler knows is reported as a generic 500 ProblemDetail;
     * its message, which may name tables, queries or values, stays in the log.
     */
    @Test
    void unexpectedExceptionIsAGeneric500WithoutInternalDetails() throws Exception {
        MockMvc stubMvc = MockMvcBuilders.standaloneSetup(new StubController())
                .setControllerAdvice(exceptionHandler)
                .build();

        String body = stubMvc.perform(get("/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.title").value("Internal Server Error"))
                .andExpect(jsonPath("$.detail").value("An unexpected error occurred"))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain(StubController.INTERNAL_DETAIL, "IllegalStateException", "at com.devpulse");
    }

    /**
     * An authenticated caller denied inside the security filter chain gets the
     * same 403 ProblemDetail as a {@code @PreAuthorize} denial in MVC, with the
     * request path as {@code instance} and without the exception message. No
     * URL rule denies an authenticated caller today, so the handler the chain
     * is configured with is called directly.
     */
    @Test
    void filterChainAccessDeniedIs403ProblemDetail() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/admin/users/5");
        MockHttpServletResponse response = new MockHttpServletResponse();

        accessDeniedHandler.handle(request, response, new AccessDeniedException("role ADMIN required for /admin"));

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(MediaType.parseMediaType(response.getContentType()))
                .satisfies(type -> assertThat(type.isCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)).isTrue());
        String body = response.getContentAsString();
        assertThat(JsonPath.<Integer>read(body, "$.status")).isEqualTo(403);
        assertThat(JsonPath.<String>read(body, "$.title")).isEqualTo("Forbidden");
        assertThat(JsonPath.<String>read(body, "$.detail")).isEqualTo("Access is denied");
        assertThat(JsonPath.<String>read(body, "$.instance")).isEqualTo("/admin/users/5");
        assertThat(body).doesNotContain("role ADMIN required");
    }

    /**
     * Answers like the contract stubs, which throw ResponseStatusException(NOT_IMPLEMENTED).
     * A real stub would turn this test red as soon as its endpoint is implemented.
     */
    @RestController
    static class StubController {

        static final String INTERNAL_DETAIL = "relation \"users_secret\" does not exist";

        @GetMapping("/stub")
        void stub() {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
        }

        @GetMapping("/boom")
        void boom() {
            throw new IllegalStateException(INTERNAL_DETAIL);
        }
    }
}
