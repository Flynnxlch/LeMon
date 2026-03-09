import { Router } from 'express';
import * as progressTrackController from '../controllers/progressTrackController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { getProgressTrackQuerySchema } from '../validators/progressTrack.js';

const router = Router();

router.get(
  '/',
  authMiddleware,
  validateQuery(getProgressTrackQuerySchema),
  progressTrackController.getProgressTrack
);

export default router;
