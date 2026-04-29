'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authGuard } = require('./middleware/authGuard');

const app = express();
const PORT = process.env.PORT || 3001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3002';

app.use(cookieParser());
app.use(authGuard);

app.use('/api', createProxyMiddleware({ target: BACKEND_URL, changeOrigin: true }));
app.use('/', createProxyMiddleware({ target: FRONTEND_URL, changeOrigin: true }));

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});

module.exports = app;
