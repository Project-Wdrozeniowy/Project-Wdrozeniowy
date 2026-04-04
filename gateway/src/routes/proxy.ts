import { createProxyMiddleware } from 'http-proxy-middleware';
import config from '../config';

const proxyMiddleware = createProxyMiddleware({
  target: config.backendUrl,
  changeOrigin: true,
  on: {
    error: (err, _req, res) => {
      console.error('[proxy] error:', err.message);
      // res can be ServerResponse, IncomingMessage, or Socket depending on context
      if ('writeHead' in res && typeof res.writeHead === 'function') {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend unavailable' }));
      }
    },
  },
});

export default proxyMiddleware;
