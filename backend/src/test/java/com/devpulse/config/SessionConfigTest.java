package com.devpulse.config;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.web.http.CookieSerializer;

import static org.assertj.core.api.Assertions.assertThat;

class SessionConfigTest {
    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void normalCookieHasSessionLifetimeAndExplicitTransportSecurity(boolean secure) {
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        var serializer = new SessionConfig().cookieSerializer(secure);
        serializer.writeCookieValue(new CookieSerializer.CookieValue(request, response, "opaque-random-session-id"));
        var cookie = response.getHeader("Set-Cookie");
        assertThat(cookie).startsWith("SESSION=").contains("Path=/", "HttpOnly", "SameSite=Strict")
                .doesNotContain("Domain=", "Max-Age=", "Expires=");
        assertThat(cookie.contains("Secure")).isEqualTo(secure);
    }
}
