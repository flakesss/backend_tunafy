const ApiError = require('../utils/ApiError');
const { NODE_ENV } = require('../config/env');

/**
 * Global error handler — harus dipasang TERAKHIR di app.js
 * Express 5 mengenali middleware error dengan 4 parameter (err, req, res, next)
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Terjadi kesalahan pada server';

  // Log error (hanya di development)
  if (NODE_ENV === 'development') {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} — ${message}`);
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
