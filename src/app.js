const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { FRONTEND_URL, NODE_ENV } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');

const v1Router = require('./api/v1');

const app = express();

// ─── CORS Origins ──────────────────────────────────────────────
// FRONTEND_URL bisa berisi satu URL atau beberapa dipisah koma
const allowedOrigins = FRONTEND_URL
  ? FRONTEND_URL.split(',').map((u) => u.trim())
  : ['http://localhost:5173'];

// ─── Security Middleware ───────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (mis. Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} tidak diizinkan`));
  },
  credentials: true,
}));

// ─── Request Parsing ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/v1', v1Router);

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} tidak ditemukan`));
});

// ─── Global Error Handler (harus paling akhir) ────────────────
app.use(errorHandler);

module.exports = app;