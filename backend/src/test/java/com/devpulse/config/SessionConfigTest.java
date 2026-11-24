package com.devpulse.config;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.web.http.CookieSerializer;

import static org.assertj.core.api.Assertions.assertThat;

class SessionConfigTest {
    @org.junit.jupiter.api.Test
    void transportSessionResolutionCannotAccidentallyTouchOrCreateTheHttpSession() {
        var config = new SessionConfig();
        var resolver = config.httpSessionIdResolver(config.cookieSerializer(false));
        var request = new MockHttpServletRequest("GET", "/api/ws/info");
        request.setContextPath("/api");
        var response = new MockHttpServletResponse();
        assertThat(resolver.resolveSessionIds(request)).isEmpty();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> resolver.setSessionId(request, response, "new"))
                .isInstanceOf(IllegalStateException.class);
        resolver.expireSession(request, response);
        assertThat(response.getHeaders("Set-Cookie")).isEmpty();
        request.setRequestURI("/api/users/me");
        resolver.setSessionId(request, response, "normal");
        assertThat(response.getHeader("Set-Cookie")).startsWith("SESSION=");
        resolver.expireSession(request, response);
        assertThat(response.getHeaders("Set-Cookie")).anyMatch(value -> value.contains("Max-Age=0"));
        request.setRequestURI("/api/ws");
        assertThat(resolver.resolveSessionIds(request)).isEmpty();
    }
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
