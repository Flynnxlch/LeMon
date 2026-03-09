import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import config from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import assetRequestRoutes from './routes/assetRequestRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import progressTrackRoutes from './routes/progressTrackRoutes.js';
import authRoutes from './routes/authRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import reassignmentRequestRoutes from './routes/reassignmentRequestRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import transferRequestRoutes from './routes/transferRequestRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(globalLimiter);

// Lightweight readiness check: ensures backend is accepting connections before first real request.
// In production, point load balancer / ingress at this so traffic only hits when ready.
app.get(`${config.apiPrefix}/health`, (req, res) => {
  res.status(200).json({ ok: true });
});

app.use(`${config.apiPrefix}/auth`, authRoutes);
app.use(`${config.apiPrefix}/branches`, branchRoutes);
app.use(`${config.apiPrefix}/users`, userRoutes);
app.use(`${config.apiPrefix}/assets`, assetRoutes);
app.use(`${config.apiPrefix}/progress-track`, progressTrackRoutes);
app.use(`${config.apiPrefix}/transfer-requests`, transferRequestRoutes);
app.use(`${config.apiPrefix}/reassignment-requests`, reassignmentRequestRoutes);
app.use(`${config.apiPrefix}/asset-requests`, assetRequestRoutes);
app.use(`${config.apiPrefix}/settings`, settingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
