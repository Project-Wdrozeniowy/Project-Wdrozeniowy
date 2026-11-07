import express from 'express';
import type { RequestHandler } from 'express';
import fs from 'node:fs';
import path from 'node:path';

export function assertSpaBuild(directory: string): void {
  try {
    if (fs.statSync(path.join(directory, 'index.html')).isFile()) {
      return;
    }
  } catch {
    // Missing/inaccessible artifacts must fail before the server starts listening.
  }
  throw new Error('SPA build is missing. Build the frontend or use the API-only development mode.');
}

/** API and transport handling always precede this middleware. */
export function spaMiddleware(directory: string): RequestHandler[] {
  const root = path.resolve(directory);
  const assets = express.static(root, {
    index: false,
    redirect: false,
    setHeaders: (res, file) => {
      const fingerprinted =
        path.dirname(file).startsWith(path.join(root, 'assets')) &&
        /-[\w-]{8,}\.[\w]+$/.test(path.basename(file));
      res.setHeader(
        'Cache-Control',
        fingerprinted ? 'public, max-age=31536000, immutable' : 'no-cache'
      );
    },
  });
  const navigation: RequestHandler = (req, res, next) => {
    // The representation depends on Accept even when fallback is rejected.
    res.vary('Accept');
    const eligible =
      (req.method === 'GET' || req.method === 'HEAD') &&
      /(?:^|,)\s*text\/html\s*(?:;|,|$)/i.test(req.get('accept') ?? '') &&
      req.accepts('html') !== false &&
      !/^\/(?:api|ws)(?:\/|$)/.test(req.path) &&
      !req.path.startsWith('/assets/') &&
      !/\.(?:js|css|map|woff2?|ttf|otf|ico|png|jpe?g|svg|webp|gif|json|txt)$/i.test(req.path);
    if (!eligible) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(root, 'index.html'));
  };
  return [assets, navigation];
}
