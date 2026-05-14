import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Options } from 'http-proxy-middleware';
import type { IncomingMessage } from 'http';
import config from '../config';

type ProxyErrorHandler = NonNullable<NonNullable<Options['on']>['error']>;

function getPath(req: IncomingMessage): string {
  return req.url ?? '/';
}

const handleProxyError: ProxyErrorHandler = (err, req, res): void => {
  console.error(`[proxy] error on ${req.method ?? 'GET'} ${getPath(req)}: ${err.message}`);
  if ('writeHead' in res) {
    const body = JSON.stringify({
      status: 502,
      error: 'Bad Gateway',
      message: 'Backend unavailable',
      path: getPath(req),
      timestamp: new Date().toISOString(),
    });
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(body);
  }
};

const proxyMiddleware = createProxyMiddleware({
  target: config.backendUrl,
  changeOrigin: true,
  pathFilter: '/api',
  on: {
    error: handleProxyError,
  },
});

export default proxyMiddleware;
