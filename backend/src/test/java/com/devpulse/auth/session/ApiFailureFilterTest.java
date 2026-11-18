package com.devpulse.auth.session;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.assertj.core.api.Assertions.*;

class ApiFailureFilterTest {
    @Test void storeFailureIsARecoverableProblemEvenWhenHtmlWasRequested() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/users/me");
        request.addHeader("Accept", "text/html");
        var response = new MockHttpServletResponse();
        new ApiFailureFilter().doFilter(request, response, (req, res) -> {
            throw new DataAccessResourceFailureException("SESSION=secret password=hidden");
        });
        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getContentType()).startsWith("application/problem+json");
        assertThat(response.getContentAsString()).doesNotContain("secret", "password", "hidden");
    }
    @Test void unexpectedFilterFailureDoesNotLeakInternalMessages() throws Exception {
        var response = new MockHttpServletResponse();
        new ApiFailureFilter().doFilter(new MockHttpServletRequest("GET", "/api/test"), response,
                (req, res) -> { throw new IllegalStateException("private"); });
        assertThat(response.getStatus()).isEqualTo(500);
        assertThat(response.getContentAsString()).doesNotContain("private");
    }
}
