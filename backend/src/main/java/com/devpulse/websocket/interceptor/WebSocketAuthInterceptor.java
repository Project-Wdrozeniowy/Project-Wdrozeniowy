package com.devpulse.websocket.interceptor;

import com.devpulse.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

/**
 * STOMP channel interceptor that validates the JWT from the {@code Authorization}
 * header sent in the {@code CONNECT} frame and sets the authenticated principal
 * on the STOMP session.
 *
 * <p>Clients must include the token in the STOMP CONNECT frame:
 * <pre>
 *   CONNECT
 *   Authorization: Bearer &lt;accessToken&gt;
 * </pre>
 */
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                String username = jwtUtil.extractUsername(token);
                if (username != null) {
                    var userDetails = userDetailsService.loadUserByUsername(username);
                    if (jwtUtil.isTokenValid(token, userDetails)) {
                        var auth = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        accessor.setUser(auth);
                    }
                }
            }
        }
        return message;
    }
}
