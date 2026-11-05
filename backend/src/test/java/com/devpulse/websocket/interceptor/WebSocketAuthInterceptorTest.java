package com.devpulse.websocket.interceptor;

import com.devpulse.security.JwtUtil;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.security.Principal;
import java.util.Date;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/**
 * How {@link WebSocketAuthInterceptor} treats the STOMP {@code CONNECT} frame.
 *
 * <p>Interim policy until real-time delivery is designed in PWDRZ-104: only a
 * {@code CONNECT} with a valid access token of an existing user gets a
 * principal; a {@code CONNECT} whose token is invalid, expired or names an
 * unknown user fails, so the broker answers with an {@code ERROR} frame and
 * closes the session.
 *
 * <p>Current limitations, pinned here so a change is noticed but not certified
 * as final behaviour: a {@code CONNECT} without a token, or with another
 * scheme, is let through without a principal, and later frames such as
 * {@code SUBSCRIBE} are not checked at all. Rejecting anonymous clients and
 * isolating recipients is part of PWDRZ-104.
 */
class WebSocketAuthInterceptorTest {

    private static final String SECRET =
            "dGVzdC1zZWNyZXQta2V5LXRoYXQtaXMtbG9uZy1lbm91Z2gtZm9yLWhtYWMtc2hhMjU2";
    private static final String OTHER_SECRET = "another-secret-that-is-at-least-32-bytes-long";

    private final JwtUtil jwtUtil = new JwtUtil(SECRET, 900L);
    private final UserDetails alice = User.withUsername("alice")
            .password("irrelevant")
            .roles("MODERATOR")
            .build();
    private final MessageChannel channel = mock(MessageChannel.class);

    private WebSocketAuthInterceptor interceptor;

    @BeforeEach
    void setUp() {
        Map<String, UserDetails> users = Map.of(alice.getUsername(), alice);
        UserDetailsService userDetailsService = username -> {
            UserDetails user = users.get(username);
            if (user == null) {
                throw new UsernameNotFoundException("User not found: " + username);
            }
            return user;
        };
        interceptor = new WebSocketAuthInterceptor(jwtUtil, userDetailsService);
    }

    @Test
    void aValidTokenMakesTheUserThePrincipalOfTheSession() {
        Message<?> result = interceptor.preSend(connect("Bearer " + jwtUtil.generateAccessToken(alice)), channel);

        Principal principal = principalOf(result);
        assertThat(principal).isInstanceOf(UsernamePasswordAuthenticationToken.class);
        UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
        assertThat(auth.isAuthenticated()).isTrue();
        assertThat(auth.getName()).isEqualTo("alice");
        assertThat(auth.getCredentials()).as("the token is not kept on the session").isNull();
        assertThat(auth.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_MODERATOR");
    }

    @Test
    void aTokenSignedWithAnotherKeyFailsTheConnect() {
        String forged = new JwtUtil(OTHER_SECRET, 900L).generateAccessToken(alice);

        assertThatThrownBy(() -> interceptor.preSend(connect("Bearer " + forged), channel))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void aMalformedTokenFailsTheConnect() {
        assertThatThrownBy(() -> interceptor.preSend(connect("Bearer not-a-jwt"), channel))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void anExpiredTokenFailsTheConnect() {
        String expired = new JwtUtil(SECRET, -60L).generateAccessToken(alice);

        assertThatThrownBy(() -> interceptor.preSend(connect("Bearer " + expired), channel))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void aValidTokenOfAnUnknownUserFailsTheConnect() {
        UserDetails deleted = User.withUsername("deleted").password("irrelevant").roles("USER").build();
        String token = jwtUtil.generateAccessToken(deleted);

        assertThatThrownBy(() -> interceptor.preSend(connect("Bearer " + token), channel))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    /** Provisional (PWDRZ-104): a correctly signed token without a subject names no user, so no principal. */
    @Test
    void aSignedTokenWithoutSubjectGetsNoPrincipal() {
        String token = Jwts.builder()
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET)), Jwts.SIG.HS256)
                .compact();

        Message<?> result = interceptor.preSend(connect("Bearer " + token), channel);

        assertThat(principalOf(result)).isNull();
    }

    /** Messages that are not STOMP frames are passed on unchanged. */
    @Test
    void aMessageWithoutStompHeadersIsPassedOn() {
        Message<String> message = MessageBuilder.withPayload("ping").build();

        assertThat(interceptor.preSend(message, channel)).isSameAs(message);
    }

    /** Provisional (PWDRZ-104): anonymous clients are not rejected yet, they only get no principal. */
    @Test
    void aConnectWithoutTokenIsNotRejectedYetButGetsNoPrincipal() {
        Message<?> message = connect(null);

        Message<?> result = interceptor.preSend(message, channel);

        assertThat(result).isSameAs(message);
        assertThat(principalOf(result)).isNull();
    }

    /** Provisional (PWDRZ-104): another scheme is treated like a missing token. */
    @Test
    void aConnectWithAnotherSchemeIsNotRejectedYetButGetsNoPrincipal() {
        Message<?> result = interceptor.preSend(connect("Basic YWxpY2U6c2VjcmV0"), channel);

        assertThat(principalOf(result)).isNull();
    }

    /** Provisional (PWDRZ-104): only CONNECT is checked, so a SUBSCRIBE is passed on unchanged. */
    @Test
    void framesOtherThanConnectAreNotCheckedYet() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/user/queue/notifications");
        accessor.setNativeHeader("Authorization", "Bearer not-a-jwt");
        accessor.setLeaveMutable(true);
        Message<byte[]> subscribe = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(subscribe, channel);

        assertThat(result).isSameAs(subscribe);
        assertThat(principalOf(result)).isNull();
    }

    private static Message<byte[]> connect(String authorization) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (authorization != null) {
            accessor.setNativeHeader("Authorization", authorization);
        }
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static Principal principalOf(Message<?> message) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        return accessor == null ? null : accessor.getUser();
    }
}
