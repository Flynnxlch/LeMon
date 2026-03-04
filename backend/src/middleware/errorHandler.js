import crypto from 'crypto';
import config from '../config/index.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  const status = err.statusCode || err.status || 500;
  const requestId = crypto.randomUUID();
  const message = status >= 500 && config.nodeEnv === 'production'
    ? 'An unexpected error occurred.'
    : (err.message || 'An unexpected error occurred.');

  if (status >= 500) {
    console.error(`[${requestId}] ${req.method} ${req.originalUrl}:`, err.stack || err.message);
  }

  // FIX [F003]: Send stack only in explicit development to avoid leaking paths in staging/production
  const isDev = config.nodeEnv === 'development';
  res.status(status).json({
    success: false,
    error: message,
    ...(status >= 500 && { requestId }),
    ...(isDev && err.stack && { stack: err.stack }),
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: 'Not found' });
}
