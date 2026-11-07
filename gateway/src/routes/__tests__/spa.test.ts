import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { spaMiddleware, assertSpaBuild } from '../spa';
import { createApp } from '../../app';

let directory: string;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'orbita-spa-'));
  fs.mkdirSync(path.join(directory, 'assets'));
  fs.writeFileSync(
    path.join(directory, 'index.html'),
    '<!doctype html><div id="root">Orbita</div>'
  );
  fs.writeFileSync(path.join(directory, 'assets', 'index-abcdefgh.js'), 'console.log("asset")');
  fs.writeFileSync(path.join(directory, 'favicon.ico'), 'icon');
});
afterEach(() => {
  const resolved = path.resolve(directory);
  if (
    path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
    !path.basename(resolved).startsWith('orbita-spa-')
  ) {
    throw new Error('Unowned SPA fixture');
  }
  fs.rmSync(resolved, { recursive: true, force: true });
});

it('validates the production build and refuses missing assets at startup', () => {
  expect(() => {
    assertSpaBuild(directory);
  }).not.toThrow();
  expect(() => {
    assertSpaBuild(path.join(directory, 'missing'));
  }).toThrow('SPA build is missing');
});

it('refuses a directory named index.html instead of a built entry document', () => {
  fs.unlinkSync(path.join(directory, 'index.html'));
  fs.mkdirSync(path.join(directory, 'index.html'));
  expect(() => {
    assertSpaBuild(directory);
  }).toThrow('SPA build is missing');
});

it.each(['text/html;q=0', 'text/html;q=0, */*;q=1', 'text/html-not-a-document'])(
  'does not serve navigation HTML when Accept rejects it: %s',
  async (accept) => {
    const response = await request(createApp(directory)).get('/forum').set('Accept', accept);
    expect(response.status).toBe(404);
    expect(response.type).toBe('application/json');
    expect(response.headers.vary).toMatch(/\bAccept\b/);
  }
);

it('accepts case-insensitive HTML media types for browser navigation', async () => {
  const response = await request(createApp(directory)).get('/forum').set('Accept', 'TEXT/HTML');
  expect(response.status).toBe(200);
  expect(response.type).toBe('text/html');
  expect(response.headers.vary).toMatch(/\bAccept\b/);
});

it.each(['/', '/forum/a-post?tag=react', '/settings', '/unknown-client-route'])(
  'serves revalidated HTML for browser navigation to %s',
  async (route) => {
    const response = await request(createApp(directory)).get(route).set('Accept', 'text/html');
    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('id="root"');
    expect(response.headers['cache-control']).toBe('no-cache');
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    expect(response.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
  }
);

it('serves JS with its MIME and immutable caching, and public files without immutable caching', async () => {
  const app = createApp(directory);
  const asset = await request(app).get('/assets/index-abcdefgh.js');
  expect(asset.status).toBe(200);
  expect(asset.type).toMatch(/javascript/);
  expect(asset.headers['cache-control']).toContain('immutable');
  expect((await request(app).get('/favicon.ico')).headers['cache-control']).toBe('no-cache');
  expect((await request(app).head('/forum').set('Accept', 'text/html')).status).toBe(200);
});

it.each(['/assets/missing.js', '/missing.css', '/missing.ico', '/api/missing', '/ws/info'])(
  'never falls back to SPA HTML for %s',
  async (route) => {
    const app = express();
    app.use(...spaMiddleware(directory));
    expect((await request(app).get(route).set('Accept', 'text/html')).status).toBe(404);
  }
);

it('excludes non-navigation requests and non-GET methods from fallback', async () => {
  const app = createApp(directory);
  expect((await request(app).get('/forum').set('Accept', 'application/json')).status).toBe(404);
  expect((await request(app).get('/forum')).status).toBe(404);
  expect((await request(app).get('/forum').set('Accept', '*/*')).status).toBe(404);
  expect((await request(app).post('/forum').set('Accept', 'text/html')).status).toBe(404);
  // Near-prefix browser paths must not be mistaken for API or WebSocket requests.
  expect((await request(app).get('/api-other').set('Accept', 'text/html')).status).toBe(200);
  expect((await request(app).get('/ws-other').set('Accept', 'text/html')).status).toBe(200);
});

it('does not consume the API quota while loading static files', async () => {
  const app = createApp(directory);
  for (let index = 0; index < 105; index++) {
    expect((await request(app).get('/assets/index-abcdefgh.js')).status).toBe(200);
  }
  // This protected request exercises the actual limiter and auth, without contacting a backend.
  const api = await request(app).get('/api/analytics/trends');
  expect(api.status).toBe(401);
  expect(api.headers['ratelimit-remaining']).toBe('99');
  // The unchanged default policy still exhausts after 100 API requests.
  for (let index = 0; index < 99; index++) {
    expect((await request(app).get('/api/analytics/trends')).status).toBe(401);
  }
  const limited = await request(app).get('/api/analytics/trends');
  expect(limited.status).toBe(429);
  expect(limited.headers['retry-after']).toBeDefined();
  expect(limited.headers['ratelimit-remaining']).toBe('0');
  expect((await request(app).get('/assets/index-abcdefgh.js')).status).toBe(200);
});
