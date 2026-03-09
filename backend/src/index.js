import config from './config/index.js';
import app from './app.js';
import { prisma } from './lib/prisma.js';

// Establish DB connection on startup so the first request does not hit a cold connection
// (avoids timeouts/ECONNRESET on first login or /auth/me).
async function start() {
  try {
    await prisma.$connect();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
    console.log(`API prefix: ${config.apiPrefix}`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start();
