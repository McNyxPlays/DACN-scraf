// app.js
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');

// === Chỉ import 1 file route ===
const apiRoutes = require('./routes/api');

const app = express();

// === MIDDLEWARE ===
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// === CSRF TOKEN ===
app.use((req, res, next) => {
  if (!req.session.csrf_token) {
    req.session.csrf_token = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// === ROUTES ===
app.use('/api', apiRoutes); // Tất cả route từ api.js

// === STATIC FILES ===
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// === ERROR HANDLER ===
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Something went wrong!' });
});

module.exports = app;