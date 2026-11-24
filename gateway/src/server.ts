import http from 'node:http';
import { Socket } from 'node:net';
import type { Express } from 'express';
import wsProxy, { isWsPath } from './routes/wsProxy';

/** The same startup boundary is exercised by real HTTP/Upgrade integration tests. */
export function createGatewayServer(app: Express): http.Server {
  const server = http.createServer(app);
  server.headersTimeout = 10000;
  server.on('upgrade', (req, socket, head) => {
    if (isWsPath(req.url ?? '/') && socket instanceof Socket) {
      wsProxy.upgrade(req, socket, head);
    } else {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    }
  });
  return server;
}
