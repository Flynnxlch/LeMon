import rateLimit from 'express-rate-limit';

const WINDOW_15MIN = 15 * 60 * 1000;

/** Global rate limiter — prevents abuse across all API endpoints */
export const globalLimiter = rateLimit({
  windowMs: WINDOW_15MIN,
  max: 200,
  message: { success: false, error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Hanya dipakai untuk Register (POST account-requests) */
export const registerLimiter = rateLimit({
  windowMs: WINDOW_15MIN,
  max: 15,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Hanya dipakai untuk Add Asset (POST /assets) */
export const addAssetLimiter = rateLimit({
  windowMs: WINDOW_15MIN,
  max: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Login, forgot-password, reset-password */
export const authLimiter = rateLimit({
  windowMs: WINDOW_15MIN,
  max: 30,
  message: { success: false, error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
