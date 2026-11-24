import { createProxyMiddleware } from 'http-proxy-middleware';
import type { IncomingMessage } from 'node:http';
import type { Request, Response } from 'express';
import config from '../config';
import { logger } from '../middleware/logger';
import { sendError } from '../middleware/errorHandler';

export const isWsPath = (url: string): boolean => {
  const pathname = url.split('?')[0];
  return pathname === '/ws' || pathname.startsWith('/ws/');
};
const upgraded = new WeakSet<IncomingMessage>();

/** Transport only: Spring authenticates SESSION, checks CONNECT CSRF and authorizes recipients. */
const wsProxyMiddleware = createProxyMiddleware<Request, Response>({
  target: config.backendUrl,
  changeOrigin: true,
  // Upgrade is registered explicitly on our server, independently of earlier HTTP traffic.
  ws: false,
  proxyTimeout: config.http.upstreamTimeoutMs,
  pathFilter: (pathname) => isWsPath(pathname),
  pathRewrite: { '^/ws(?=/|$)': '/api/ws' },
  on: {
    proxyReq: (upstream, req) => {
      if (Buffer.isBuffer(req.body)) {
        upstream.removeHeader('transfer-encoding');
        upstream.setHeader('Content-Length', req.body.length);
        upstream.write(req.body);
      }
    },
    proxyReqWs: (upstream, req, socket) => {
      const deadline = setTimeout(() => {
        upstream.destroy();
        socket.destroy();
      }, config.http.bodyTimeoutMs);
      upstream.once('upgrade', () => {
        upgraded.add(req);
        clearTimeout(deadline);
      });
      upstream.once('response', () => {
        clearTimeout(deadline);
      });
      upstream.once('error', () => {
        clearTimeout(deadline);
      });
      socket.once('close', () => {
        clearTimeout(deadline);
      });
    },
    error: (err, req, res) => {
      const code = (err as NodeJS.ErrnoException).code;
      logger.error(`[ws-proxy] ${code ?? 'upstream-failure'}`);
      if ('writeHead' in res) {
        sendError(res, req, 502, 'Backend unavailable');
      } else if (!upgraded.has(req) && !res.destroyed) {
        const body = JSON.stringify({ type: 'about:blank', title: 'Bad Gateway', status: 502 });
        res.end(
          `HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Type: application/problem+json\r\nContent-Length: ${String(Buffer.byteLength(body))}\r\n\r\n${body}`
        );
      } else {
        res.destroy();
      }
    },
  },
});
export default wsProxyMiddleware;
