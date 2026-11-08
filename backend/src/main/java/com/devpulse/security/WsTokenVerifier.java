package com.devpulse.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/** Legacy STOMP verifier only, pending PWDRZ-104. No HTTP issuer or REST authentication consumer. */
@Component
public class WsTokenVerifier {
    private final SecretKey key;
    public WsTokenVerifier(@Value("${ws.legacy-jwt-secret}") String secret) {
        byte[] bytes;
        try { bytes = Decoders.BASE64.decode(secret); }
        catch (RuntimeException e) { bytes = secret.getBytes(StandardCharsets.UTF_8); }
        if (bytes.length < 32) throw new IllegalStateException("Legacy WS signing key must contain at least 32 bytes");
        key = Keys.hmacShaKeyFor(bytes);
    }
    public String extractUsername(String token) { return claims(token).getSubject(); }
    public boolean isTokenValid(String token, UserDetails user) {
        try { return user.getUsername().equals(claims(token).getSubject()); }
        catch (JwtException | IllegalArgumentException e) { return false; }
    }
    private Claims claims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
