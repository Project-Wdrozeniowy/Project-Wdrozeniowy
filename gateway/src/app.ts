import express from 'express';
import helmet from 'helmet';
import corsMiddleware from './middleware/cors';
import rateLimiter from './middleware/rateLimiter';
import { accessLogger, errorLogger } from './middleware/logger';
import { boundedBody } from './middleware/boundedBody';
import { loginLimiter, csrfLimiter } from './middleware/rateLimiter';
import proxyMiddleware from './routes/proxy';
import { errorHandler, sendError } from './middleware/errorHandler';
import wsProxyMiddleware from './routes/wsProxy';
import config from './config';
import { spaMiddleware } from './routes/spa';

export function createApp(spaDirectory?: string): express.Express {
  const app = express();
  app.set('trust proxy', config.trustedProxies.length ? config.trustedProxies : false);

  // The experiment is served over local HTTP. Do not upgrade its assets to HTTPS.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          imgSrc: ["'self'", 'data:', 'https:', 'http:'],
          upgradeInsecureRequests: config.production ? [] : null,
        },
      },
    })
  );
  app.use(corsMiddleware);
  app.use(accessLogger);
  app.use(errorLogger);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', rateLimiter);
  app.post('/api/auth/login', loginLimiter);
  app.get('/api/auth/csrf', csrfLimiter);
  app.use('/api', boundedBody);
  app.use(proxyMiddleware);
  app.use('/api', (req, res) => {
    sendError(res, req, 404, 'Not found');
  });
  // WebSocket (STOMP) — auth handled inside the STOMP CONNECT frame
  app.use(wsProxyMiddleware);
  if (spaDirectory) {
    app.use(...spaMiddleware(spaDirectory));
  }

  app.use((req, res) => {
    sendError(res, req, 404, 'Not found');
  });
  app.use(errorHandler);

  return app;
}

export default createApp(config.spa.enabled ? config.spa.directory : undefined);
