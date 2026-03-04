import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';
import { checkEmailSchema, forgotPasswordSchema, loginSchema, requestPasswordChangeSchema, resetPasswordSchema } from '../validators/auth.js';

const router = Router();

router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/check-email', authLimiter, validateBody(checkEmailSchema), authController.checkEmail);
router.post('/request-password-change', authLimiter, validateBody(requestPasswordChangeSchema), authController.requestPasswordChange);

export default router;
