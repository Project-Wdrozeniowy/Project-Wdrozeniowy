'use strict';

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '3001', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
if (!process.env.INTERNAL_SECRET) {
  console.error('FATAL: INTERNAL_SECRET environment variable is not set');
  process.exit(1);
}
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

// JWT secret is Base64-encoded (matches Java's Decoders.BASE64.decode())
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}
const JWT_SECRET = Buffer.from(process.env.JWT_SECRET, 'base64');

// ---------------------------------------------------------------------------
// Express + HTTP server
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Socket.io
// ---------------------------------------------------------------------------
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// JWT authentication middleware — runs before every connection is accepted
io.use((socket, next) => {
  const raw = socket.handshake.auth?.token;
  if (!raw) {
    return next(new Error('AUTH_MISSING'));
  }
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.data.user = payload; // { sub: username, iat, exp, ... }
    next();
  } catch {
    next(new Error('AUTH_INVALID'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  const username = socket.data.user?.sub;

  // Auto-join a private room for targeted notifications
  socket.join(`user:${username}`);

  // Join a forum thread room
  socket.on('join_thread', ({ postId }) => {
    if (!postId) return;
    socket.join(`thread:${postId}`);
  });

  // Leave a forum thread room
  socket.on('leave_thread', ({ postId }) => {
    if (!postId) return;
    socket.leave(`thread:${postId}`);
  });

  socket.on('disconnect', () => {
    // socket.io cleans up rooms automatically on disconnect
  });
});

// ---------------------------------------------------------------------------
// Internal emit endpoint (called by Spring Boot backend)
//   POST /internal/emit
//   Authorization: Bearer <INTERNAL_SECRET>
//   Body: { "room": "thread:123", "event": "new_post", "data": { ... } }
// ---------------------------------------------------------------------------
app.post('/internal/emit', (req, res) => {
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${INTERNAL_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { room, event, data } = req.body;
  if (!room || !event) {
    return res.status(400).json({ error: 'Missing room or event' });
  }

  io.to(room).emit(event, data ?? {});
  res.json({ ok: true, room, event });
});

// ---------------------------------------------------------------------------
// HTTP reverse proxy — all other traffic forwarded to Spring Boot
// ---------------------------------------------------------------------------
app.use(
  '/',
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    on: {
      error: (_err, _req, res) => {
        res.status(502).json({ error: 'Backend unavailable' });
      },
    },
  })
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Gateway listening on port ${PORT}`);
  console.log(`Proxying REST traffic to ${BACKEND_URL}`);
  console.log(`WebSocket CORS origin: ${FRONTEND_URL}`);
});
