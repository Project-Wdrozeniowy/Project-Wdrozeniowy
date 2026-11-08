package com.devpulse.support;

import com.devpulse.security.WsTokenVerifier;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.userdetails.UserDetails;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/** Synthetic legacy STOMP credentials only. Production HTTP has no JWT issuer. */
public class JwtTestTokens extends WsTokenVerifier {
    private final String secret;
    private final long lifetime;
    public JwtTestTokens(String secret, long lifetime) {
        super(secret);
        this.secret = secret;
        this.lifetime = lifetime;
    }
    public String generateAccessToken(UserDetails user) {
        byte[] bytes;
        try { bytes = Decoders.BASE64.decode(secret); }
        catch (RuntimeException e) { bytes = secret.getBytes(StandardCharsets.UTF_8); }
        return Jwts.builder().subject(user.getUsername()).issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + lifetime * 1000))
                .signWith(Keys.hmacShaKeyFor(bytes), Jwts.SIG.HS256).compact();
    }
}
