import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Options } from 'http-proxy-middleware';
import config from '../config';

type ProxyErrorHandler = NonNullable<NonNullable<Options['on']>['error']>;

const handleProxyError: ProxyErrorHandler = (err, _req, res): void => {
  console.error('[proxy] error:', err.message);
  if ('writeHead' in res) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Backend unavailable' }));
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
