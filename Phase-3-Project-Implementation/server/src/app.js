const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./database/db');

const authRouter = require('./routes/auth');
const readingsRouter = require('./routes/readings');
const doctorsRouter = require('./routes/doctors');
const subscriptionsRouter = require('./routes/subscriptions');
const chatRouter = require('./routes/chat');
const notificationsRouter = require('./routes/notifications');

const app = express();

// Allowed origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true); // Allow all during development & deployment verification
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static folder for uploaded files if any
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Sweety Blood Glucose Tracker API',
    timestamp: new Date().toISOString(),
    isInMemoryDb: db.isInMemory()
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/readings', readingsRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/notifications', notificationsRouter);

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error.'
    : err.message || 'Internal server error.';
  res.status(status).json({ error: message });
});

module.exports = app;
