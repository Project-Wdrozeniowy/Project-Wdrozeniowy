package com.devpulse.websocket.security;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import java.util.Map;

@Component
public class WsHandshake implements HandshakeInterceptor {
    @Override public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler handler, Map<String, Object> attributes) {
        if (!(request instanceof ServletServerHttpRequest servlet)) return false;
        Object access = servlet.getServletRequest().getAttribute(WsSessionAccess.ATTRIBUTE);
        if (!(access instanceof WsSessionAccess.Access authenticated) || authenticated.csrf() == null) return false;
        attributes.put(WsSessionAccess.ATTRIBUTE, authenticated);
        attributes.put(CsrfToken.class.getName(), authenticated.csrf());
        return true;
    }
    @Override public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler handler, Exception exception) {}
}
