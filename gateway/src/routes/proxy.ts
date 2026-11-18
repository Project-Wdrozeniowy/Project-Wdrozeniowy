import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Request, Response } from 'express';
import config from '../config';
import { sendError } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';

const proxyMiddleware = createProxyMiddleware<Request, Response>({
  target: config.backendUrl,
  changeOrigin: true,
  proxyTimeout: config.http.upstreamTimeoutMs,
  pathFilter: (pathname) => pathname === '/api' || pathname.startsWith('/api/'),
  on: {
    proxyReq: (proxyReq, req, res) => {
      // The edge reconstructs these from the explicitly trusted topology.
      for (const name of Object.keys(req.headers)) {
        if (
          name === 'forwarded' ||
          name.startsWith('x-forwarded-') ||
          name === 'x-user-id' ||
          name === 'x-authenticated-user'
        ) {
          proxyReq.removeHeader(name);
        }
      }
      proxyReq.setHeader('X-Forwarded-For', req.ip ?? req.socket.remoteAddress ?? '');
      proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
      if (Buffer.isBuffer(req.body)) {
        proxyReq.removeHeader('transfer-encoding');
        proxyReq.setHeader('Content-Length', req.body.length);
        proxyReq.write(req.body);
      }
      // proxyTimeout is an inactivity timer; this is the bounded overall upstream deadline.
      const deadline = setTimeout(() => {
        if (!res.writableEnded) {
          sendError(res, req, 504, 'Backend timed out');
        }
        proxyReq.destroy();
      }, config.http.upstreamTimeoutMs);
      res.once('close', () => {
        clearTimeout(deadline);
        proxyReq.destroy();
      });
      res.once('finish', () => {
        clearTimeout(deadline);
      });
    },
    proxyRes: (upstream, req, res) => {
      upstream.once('aborted', () => {
        if (!res.writableEnded) {
          sendError(res, req, 502, 'Backend response interrupted');
        }
      });
      upstream.once('error', () => {
        if (!res.writableEnded) {
          sendError(res, req, 502, 'Backend response interrupted');
        }
      });
    },
    error: (err, req, res) => {
      const code = (err as NodeJS.ErrnoException).code;
      logger.error(`[proxy] ${code ?? 'upstream-failure'}`);
      if ('writeHead' in res) {
        if (!res.writableEnded) {
          sendError(
            res,
            req,
            code === 'ETIMEDOUT' ? 504 : 502,
            code === 'ETIMEDOUT' ? 'Backend timed out' : 'Backend unavailable'
          );
        }
      } else {
        res.destroy();
      }
    },
  },
});
export default proxyMiddleware;
