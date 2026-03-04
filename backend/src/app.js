import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import userRoutes from './routes/userRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import transferRequestRoutes from './routes/transferRequestRoutes.js';
import reassignmentRequestRoutes from './routes/reassignmentRequestRoutes.js';
import assetRequestRoutes from './routes/assetRequestRoutes.js';
import settingRoutes from './routes/settingRoutes.js';

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
app.use(`${config.apiPrefix}/transfer-requests`, transferRequestRoutes);
app.use(`${config.apiPrefix}/reassignment-requests`, reassignmentRequestRoutes);
app.use(`${config.apiPrefix}/asset-requests`, assetRequestRoutes);
app.use(`${config.apiPrefix}/settings`, settingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
