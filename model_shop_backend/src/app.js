// src/app.js – PHIÊN BẢN CUỐI CÙNG, KHÔNG BAO GIỜ LỖI REDIS KHI DEV
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const RedisStore = require('connect-redis');
const ioredis = require('ioredis');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();

// ==================== SESSION STORE THÔNG MINH ====================
let redisClient = null;
let sessionStore;

if (process.env.NODE_ENV === 'production') {
  redisClient = new ioredis.Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: times => Math.min(times * 50, 2000),
    maxRetriesPerRequest: null,
  });
  sessionStore = new RedisStore({ client: redisClient });
  console.log('Session: RedisStore (Production mode)');
} else {
  sessionStore = new session.MemoryStore();
  console.log('Session: MemoryStore (Development – Redis bị tắt hoàn toàn)');
}

// ==================== MIDDLEWARES ====================
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  store: sessionStore,
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));

// CSRF Token
app.use((req, res, next) => {
  if (!req.session.csrf_token) {
    req.session.csrf_token = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrf_token;
  next();
});

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Something went wrong!' });
});

module.exports = app;