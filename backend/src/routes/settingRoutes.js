import { Router } from 'express';
import * as settingController from '../controllers/settingController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { updateReminderSchema } from '../validators/setting.js';

const router = Router();

router.get('/', authMiddleware, settingController.getSettings);
router.patch('/reminder', authMiddleware, requireRole('Admin Pusat'), validateBody(updateReminderSchema), settingController.updateReminder);

export default router;
