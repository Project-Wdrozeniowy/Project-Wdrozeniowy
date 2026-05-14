import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Options } from 'http-proxy-middleware';
import config from '../config';

type ProxyErrorHandler = NonNullable<NonNullable<Options['on']>['error']>;

const handleWsProxyError: ProxyErrorHandler = (err, _req, res): void => {
  console.error('[ws-proxy] error:', err.message);
  if ('writeHead' in res) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Backend unavailable' }));
  }
};

/**
 * Proxy for STOMP-over-WebSocket connections.
 *
 * All traffic to {@code /ws} and {@code /ws/**} (including SockJS fallback
 * paths) is forwarded to the backend. Authentication happens inside the
 * STOMP CONNECT frame — the gateway does not inspect it here.
 */
const wsProxyMiddleware = createProxyMiddleware({
  target: config.backendUrl,
  changeOrigin: true,
  ws: true,
  pathFilter: ['/ws', '/ws/**'],
  on: {
    error: handleWsProxyError,
  },
});

export default wsProxyMiddleware;
