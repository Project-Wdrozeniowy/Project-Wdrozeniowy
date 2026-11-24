import { EventEmitter } from 'node:events';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '../../middleware/logger';

jest.mock('http-proxy-middleware', () => ({ createProxyMiddleware: jest.fn(() => ({})) }));
import '../wsProxy';

const options = jest.mocked(createProxyMiddleware).mock.calls[0][0];
const handler = (name: string): ((...args: object[]) => void) =>
  (options.on as unknown as Record<string, (...args: object[]) => void>)[name];
const socket = (): EventEmitter & { end: jest.Mock; destroy: jest.Mock; destroyed: boolean } =>
  Object.assign(new EventEmitter(), { end: jest.fn(), destroy: jest.fn(), destroyed: false });
const upstream = (): EventEmitter & { destroy: jest.Mock } =>
  Object.assign(new EventEmitter(), { destroy: jest.fn() });

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('sends HTTP 502 before Upgrade and never prints the exception body', () => {
  const log = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  const response = socket();
  handler('error')(new Error('cookie=private CSRF=private'), {}, response);
  expect(response.end).toHaveBeenCalledWith(expect.stringContaining('HTTP/1.1 502'));
  expect(log).toHaveBeenCalledWith('[ws-proxy] upstream-failure');
});

it('destroys an upgraded transport without writing an HTTP response', () => {
  const log = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  const request = {};
  const response = socket();
  const outgoing = upstream();
  handler('proxyReqWs')(outgoing, request, response);
  outgoing.emit('upgrade');
  handler('error')(Object.assign(new Error('private'), { code: 'ECONNRESET' }), request, response);
  expect(response.destroy).toHaveBeenCalled();
  expect(response.end).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith('[ws-proxy] ECONNRESET');
  response.destroyed = true;
  handler('error')(new Error(), {}, response);
  expect(response.end).not.toHaveBeenCalled();
});

it('bounds stalled upgrades and cancels deadlines after rejection, error or peer close', () => {
  jest.useFakeTimers();
  const stalled = upstream();
  const peer = socket();
  handler('proxyReqWs')(stalled, {}, peer);
  jest.runAllTimers();
  expect(stalled.destroy).toHaveBeenCalled();
  expect(peer.destroy).toHaveBeenCalled();
  for (const event of ['response', 'error', 'close']) {
    const outgoing = upstream();
    const remote = socket();
    handler('proxyReqWs')(outgoing, {}, remote);
    (event === 'close' ? remote : outgoing).emit(event);
    jest.runAllTimers();
    expect(outgoing.destroy).not.toHaveBeenCalled();
  }
});
