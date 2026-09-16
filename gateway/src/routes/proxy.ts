import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Options } from 'http-proxy-middleware';
import type { IncomingMessage } from 'http';
import { logger } from '../middleware/logger';
import { sendError } from '../middleware/errorHandler';
import config from '../config';

type ProxyErrorHandler = NonNullable<NonNullable<Options['on']>['error']>;

function getPath(req: IncomingMessage): string {
  return req.url ?? '/';
}

const handleProxyError: ProxyErrorHandler = (err, req, res): void => {
  logger.error(`[proxy] error on ${req.method ?? 'GET'} ${getPath(req)}: ${err.message}`);

  if ('writeHead' in res && typeof res.writeHead === 'function') {
    sendError(res, req, 502, 'Backend unavailable');
    return;
  }

  if ('destroy' in res && typeof res.destroy === 'function') {
    res.destroy();
  }
};

const proxyMiddleware = createProxyMiddleware({
  target: config.backendUrl,
  changeOrigin: true,
  pathFilter: '/api',
  pathRewrite: { '^/api': '' },
  on: {
    error: handleProxyError,
  },
});

export default proxyMiddleware;
