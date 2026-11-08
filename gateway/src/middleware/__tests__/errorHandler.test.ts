import request from 'supertest';
import express from 'express';
import { createServer } from 'node:http';
import { sendError, errorHandler } from '../errorHandler';
import { logger } from '../logger';

describe('shared ProblemDetail errors', () => {
  it.each([{ statusCode: 400 }, { status: 200 }, { status: 600 }, { status: 400.5 }])(
    'normalizes parser status without exposing details: %j',
    async (properties) => {
      const app = express();
      app.get('/bad', (_req, _res, next) => {
        next(Object.assign(new Error('private'), properties));
      });
      app.use(errorHandler);
      const response = await request(app).get('/bad');
      expect(response.status).toBe(properties.statusCode === 400 ? 400 : 500);
      expect((response.body as { detail: string }).detail).not.toContain('private');
    }
  );
  it.each([401, 403, 404, 408, 413, 415, 429, 500, 502, 504, 599])(
    'writes status %s without query credentials',
    async (status) => {
      const server = createServer((req, res) => {
        sendError(res, req, status, 'Safe failure');
      });
      const response = await request(server).get('/api/test?secret=must-not-escape');
      expect(response.status).toBe(status);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body).toMatchObject({
        type: 'about:blank',
        status,
        detail: 'Safe failure',
        instance: '/api/test',
      });
      expect(JSON.stringify(response.body)).not.toContain('must-not-escape');
    }
  );

  it('masks unexpected error details in responses and logs', async () => {
    const log = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    const app = express();
    app.get('/fail', (_req, _res, next) => {
      next(new Error('session=private-cookie'));
    });
    app.use(errorHandler);
    const response = await request(app).get('/fail?password=private');
    expect(response.status).toBe(500);
    expect((response.body as { detail: string }).detail).toBe('Internal server error');
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/private|password|session=/);
    log.mockRestore();
  });

  it('destroys a partial response instead of appending a second JSON body', () => {
    const destroy = jest.fn();
    sendError(
      { headersSent: true, destroy } as unknown as express.Response,
      {} as express.Request,
      502,
      'failure'
    );
    expect(destroy).toHaveBeenCalled();
  });
});
