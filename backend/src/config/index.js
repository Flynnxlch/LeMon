import dotenv from 'dotenv';

dotenv.config();

export function parseExpiresInMs(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn || '');
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * (multipliers[unit] || 86_400_000);
}

const isProd = (process.env.NODE_ENV || 'development') === 'production';
const jwtSessionExpiresIn = process.env.JWT_EXPIRES_IN_SESSION || '12h';
const jwtRememberMeExpiresIn = process.env.JWT_REMEMBER_ME_EXPIRES_IN || '1d';

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || '/api',
  jwt: {
    secret: process.env.JWT_SECRET,
    /** When Remember Me is NOT checked — session-only cookie; JWT expires after this. */
    sessionExpiresIn: jwtSessionExpiresIn,
    /** Default when Remember Me is checked (overridable by request duration). */
    rememberMeExpiresIn: jwtRememberMeExpiresIn,
  },
  cookie: {
    name: 'token',
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: parseExpiresInMs(jwtRememberMeExpiresIn),
    path: '/',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  uploadMaxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10), // 10MB
};

if (!config.jwt.secret || config.jwt.secret.length < 32) {
  if (config.nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be set and at least 32 characters in production');
  }
  config.jwt.secret = 'dev-secret-min-32-characters-long-do-not-use-in-prod';
}

export default config;
