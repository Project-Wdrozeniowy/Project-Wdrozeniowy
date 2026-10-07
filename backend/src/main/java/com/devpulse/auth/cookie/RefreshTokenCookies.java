package com.devpulse.auth.cookie;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Writes and clears the refresh-token cookie.
 *
 * <p>The refresh token travels only in an {@code HttpOnly} cookie, so it is never
 * readable from JavaScript and cannot be stolen through XSS. {@code SameSite=Strict}
 * keeps it out of cross-site requests, and the cookie path is narrowed to the auth
 * endpoints so it is not sent with ordinary API calls.
 */
@Component
public class RefreshTokenCookies {

    public static final String NAME = "refreshToken";

    private final boolean secure;
    private final String path;
    private final Duration maxAge;

    public RefreshTokenCookies(
            @Value("${app.refresh-cookie.secure:true}") boolean secure,
            @Value("${app.refresh-cookie.path:/api/auth}") String path,
            @Value("${jwt.refresh-expiry:604800}") long refreshExpirySeconds) {
        this.secure = secure;
        this.path = path;
        this.maxAge = Duration.ofSeconds(refreshExpirySeconds);
    }

    /** Sets the refresh-token cookie on the response. */
    public void write(HttpServletResponse response, String token) {
        add(response, build(token, maxAge));
    }

    /** Instructs the browser to drop the refresh-token cookie. */
    public void clear(HttpServletResponse response) {
        add(response, build("", Duration.ZERO));
    }

    private ResponseCookie build(String value, Duration age) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path(path)
                .maxAge(age)
                .build();
    }

    private void add(HttpServletResponse response, ResponseCookie cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
