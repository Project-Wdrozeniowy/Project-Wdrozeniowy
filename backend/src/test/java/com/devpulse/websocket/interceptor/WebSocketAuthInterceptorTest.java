package com.devpulse.websocket.interceptor;

import com.devpulse.auth.session.SessionPrincipal;
import com.devpulse.websocket.security.WsSessionAccess;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.mock.web.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.web.csrf.*;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class WebSocketAuthInterceptorTest {
    final WsSessionAccess sessions = mock(WsSessionAccess.class);
    final WebSocketAuthInterceptor interceptor = new WebSocketAuthInterceptor(sessions);
    final MessageChannel channel = mock(MessageChannel.class);
    final SessionPrincipal principal = new SessionPrincipal(1L, "alice", 0, Instant.now());
    final CsrfToken csrf = new DefaultCsrfToken("X-CSRF-TOKEN", "_csrf", "server-session-secret");
    final WsSessionAccess.Access access = new WsSessionAccess.Access("http-session", principal,
            UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of()), csrf);

    @Test void notificationConnectionsMustRejectMissingAuthentication() {
        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.CONNECT, null, false, null), channel))
                .isInstanceOf(AccessDeniedException.class);
    }
    @Test void connectRequiresTheRealMaskedSessionCsrfAndRetainsTheHttpIdentity() {
        var request = new MockHttpServletRequest();
        new XorCsrfTokenRequestAttributeHandler().handle(request, new MockHttpServletResponse(), () -> csrf);
        String masked = ((CsrfToken) request.getAttribute(CsrfToken.class.getName())).getToken();
        when(sessions.read("http-session", principal)).thenReturn(access);
        Message<?> message = frame(StompCommand.CONNECT, null, true, masked);
        assertThat(interceptor.preSend(message, channel)).isSameAs(message);
        assertThat(StompHeaderAccessor.wrap(message).getUser()).isEqualTo(access.authentication());
    }
    @Test void missingOrWrongCsrfFailsConnect() {
        when(sessions.read("http-session", principal)).thenReturn(access);
        for (String token : Arrays.asList(null, "wrong"))
            assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.CONNECT, null, true, token), channel))
                    .isInstanceOf(org.springframework.security.web.csrf.CsrfException.class);
    }
    @ParameterizedTest @ValueSource(strings = {"/user/bob/queue/notifications", "/queue/notifications", "/topic/activity", "/user/**", "/app/subscribe-post/1"})
    void destinationsCannotEscapeThePersonalQueue(String destination) {
        when(sessions.read("http-session", principal)).thenReturn(access);
        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, destination, true, null), channel))
                .isInstanceOf(AccessDeniedException.class);
    }
    @Test void recipientSubscriptionWorksButClientSendsAndRevokedSessionsFail() {
        when(sessions.read("http-session", principal)).thenReturn(access);
        var subscribe = frame(StompCommand.SUBSCRIBE, "/user/queue/notifications", true, null);
        assertThat(interceptor.preSend(subscribe, channel)).isSameAs(subscribe);
        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.SEND, "/user/queue/notifications", true, null), channel))
                .isInstanceOf(AccessDeniedException.class);
        when(sessions.read("http-session", principal)).thenReturn(null);
        assertThatThrownBy(() -> interceptor.preSend(subscribe, channel)).isInstanceOf(AccessDeniedException.class);
        assertThat(interceptor.preSend(frame(StompCommand.DISCONNECT, null, false, null), channel)).isNotNull();
    }
    private Message<?> frame(StompCommand command, String destination, boolean authenticated, String token) {
        var headers = StompHeaderAccessor.create(command);
        if (destination != null) { headers.setDestination(destination); headers.setSubscriptionId("one"); }
        headers.setSessionAttributes(authenticated ? new HashMap<>(Map.of(WsSessionAccess.ATTRIBUTE, access,
                CsrfToken.class.getName(), csrf)) : new HashMap<>());
        if (token != null) headers.setNativeHeader(csrf.getHeaderName(), token);
        headers.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], headers.getMessageHeaders());
    }
}
