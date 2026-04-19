'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const { authGuard } = require('./middleware/authGuard');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cookieParser());
app.use(authGuard);

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});

module.exports = app;
