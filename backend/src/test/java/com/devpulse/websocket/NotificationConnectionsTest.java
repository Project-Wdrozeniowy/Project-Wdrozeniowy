package com.devpulse.websocket;

import com.devpulse.auth.session.SessionPrincipal;
import com.devpulse.websocket.security.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.*;
import java.time.Instant;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class NotificationConnectionsTest {
    final WsSessionAccess sessions = mock(WsSessionAccess.class);
    final SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);
    @SuppressWarnings("unchecked") final ObjectProvider<SimpMessagingTemplate> provider = mock(ObjectProvider.class);
    final NotificationConnections connections = new NotificationConnections(sessions, provider);

    WebSocketSession open(String id, Long user) {
        var principal = new SessionPrincipal(user, "user" + user, 0, Instant.now());
        var access = new WsSessionAccess.Access("http-" + id, principal,
                UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of()), null);
        var socket = mock(WebSocketSession.class);
        when(socket.getId()).thenReturn(id);
        when(socket.getAttributes()).thenReturn(Map.of(WsSessionAccess.ATTRIBUTE, access));
        when(sessions.read(access.sessionId(), principal)).thenReturn(access);
        when(provider.getObject()).thenReturn(template);
        connections.opened(socket);
        return socket;
    }
    @Test void sendsOnlyToTheRecipientsValidConnectionsAndUsesStableIds() {
        open("a", 1L); open("other-tab", 1L); open("b", 2L);
        connections.publish(1L, 9L);
        verify(template, times(2)).convertAndSendToUser(eq("user1"), eq("/queue/notifications"), any(Object.class), any(Map.class));
        verify(template, never()).convertAndSendToUser(eq("user2"), anyString(), any(Object.class), any(Map.class));
        connections.ready("b");
        verify(template).convertAndSendToUser(eq("user2"), eq("/queue/notifications"), eq(Map.of("version", 1, "type", "stream.ready")), any(Map.class));
        connections.closed("b");
        assertThat(connections.valid("b")).isFalse();
    }
    @Test void revokedAndUnavailableSessionsCloseAndCannotReceiveQueuedMessages() throws Exception {
        var socket = open("a", 1L);
        when(sessions.read(eq("http-a"), any())).thenReturn(null);
        connections.revalidate();
        verify(socket).close(any());
        connections.publish(1L, 9L);
        verifyNoInteractions(template);
        var failure = open("b", 1L);
        when(sessions.read(eq("http-b"), any())).thenThrow(new IllegalStateException("private"));
        assertThat(connections.valid("b")).isFalse();
        verify(failure).close(any());
    }
    @Test void transportFailureClosesTheRecipientAndAnonymousHandlesAreRejected() throws Exception {
        var socket = open("a", 1L);
        doThrow(new IllegalStateException("private")).when(template).convertAndSendToUser(anyString(), anyString(), any(Object.class), any(Map.class));
        connections.publish(1L, 1L);
        verify(socket).close(any());
        var anonymous = mock(WebSocketSession.class);
        when(anonymous.getAttributes()).thenReturn(Map.of());
        doThrow(new java.io.IOException()).when(anonymous).close(any());
        assertThatCode(() -> connections.opened(anonymous)).doesNotThrowAnyException();
    }
    @Test void protocolErrorsContainNoExceptionHeadersOrBody() {
        var error = new WsProtocolErrors().handleClientMessageProcessingError(null,
                new IllegalStateException("SESSION=secret X-CSRF-TOKEN=secret"));
        assertThat(StompHeaderAccessor.wrap(error).getMessage()).isEqualTo("Notification stream unavailable");
        assertThat(error.getPayload()).isEmpty();
    }
}
