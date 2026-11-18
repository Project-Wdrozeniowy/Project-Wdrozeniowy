package com.devpulse.auth.session;

import java.io.Serializable;
import java.security.Principal;
import java.time.Instant;

/** Server-owned authentication snapshot. Never contains credentials or a persistent-login secret. */
public record SessionPrincipal(Long userId, String username, long authVersion,
                               Instant authenticatedAt) implements Principal, Serializable {
    @Override
    public String getName() {
        return username;
    }
}
