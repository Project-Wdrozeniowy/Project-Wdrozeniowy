import type { Request, Response, NextFunction } from 'express';
import { sendError, errorHandler } from '../errorHandler';
import type { ErrorResponse } from '../../types';

function mockReq(url = '/api/test'): Partial<Request> {
  return { originalUrl: url } as Partial<Request>;
}

function mockRes(): { status: jest.Mock; json: jest.Mock } {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('sendError()', () => {
  it('calls res.status() with the given status code', () => {
    const req = mockReq();
    const res = mockRes();

    sendError(res as unknown as Response, req as Request, 401, 'Token expired');

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns the correct ErrorResponse shape', () => {
    const req = mockReq('/api/users');
    const res = mockRes();

    sendError(res as unknown as Response, req as Request, 401, 'Token expired');

    const body = (res.json.mock.calls[0] as [ErrorResponse])[0];
    expect(body.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toBe('Token expired');
    expect(body.path).toBe('/api/users');
    expect(typeof body.timestamp).toBe('string');
    expect(() => new Date(body.timestamp)).not.toThrow();
  });

  it('maps 500 to "Internal Server Error"', () => {
    const req = mockReq();
    const res = mockRes();

    sendError(res as unknown as Response, req as Request, 500, 'Something went wrong');

    const body = (res.json.mock.calls[0] as [ErrorResponse])[0];
    expect(body.error).toBe('Internal Server Error');
  });

  it('maps 502 to "Bad Gateway"', () => {
    const req = mockReq();
    const res = mockRes();

    sendError(res as unknown as Response, req as Request, 502, 'Backend unavailable');

    const body = (res.json.mock.calls[0] as [ErrorResponse])[0];
    expect(body.error).toBe('Bad Gateway');
  });

  it('maps 429 to "Too Many Requests"', () => {
    const req = mockReq();
    const res = mockRes();

    sendError(res as unknown as Response, req as Request, 429, 'Slow down');

    const body = (res.json.mock.calls[0] as [ErrorResponse])[0];
    expect(body.error).toBe('Too Many Requests');
  });

  it('uses "Unknown Error" for unmapped status codes', () => {
    const req = mockReq();
    const res = mockRes();

    sendError(res as unknown as Response, req as Request, 418, "I'm a teapot");

    const body = (res.json.mock.calls[0] as [ErrorResponse])[0];
    expect(body.error).toBe('Unknown Error');
  });
});

describe('errorHandler()', () => {
  it('responds with 500 and ErrorResponse shape', () => {
    const err = new Error('boom');
    const req = mockReq('/api/boom') as Request;
    req.method = 'GET';
    const res = mockRes();
    const next: NextFunction = jest.fn();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json.mock.calls[0] as [ErrorResponse])[0];
    expect(body.status).toBe(500);
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toBe('Internal server error');
  });

  it('logs the error to console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const err = new Error('unexpected');
    const req = mockReq() as Request;
    req.method = 'POST';
    const res = mockRes();
    const next: NextFunction = jest.fn();

    errorHandler(err, req, res as unknown as Response, next);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
