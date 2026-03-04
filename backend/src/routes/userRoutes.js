import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { registerLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';
import { approveAccountRequestSchema, createAccountRequestSchema } from '../validators/accountRequest.js';
import { updateUserBranchSchema } from '../validators/user.js';

const router = Router();

router.get('/', authMiddleware, requireRole('Admin Pusat', 'Admin Cabang'), userController.getUsers);
router.get('/account-requests', authMiddleware, requireRole('Admin Pusat', 'Admin Cabang'), userController.getAccountRequests);
router.post('/account-requests', registerLimiter, validateBody(createAccountRequestSchema), userController.createAccountRequest);
router.patch('/account-requests/:id/approve', authMiddleware, requireRole('Admin Pusat'), validateBody(approveAccountRequestSchema), userController.approveAccountRequest);
router.patch('/account-requests/:id/reject', authMiddleware, requireRole('Admin Pusat'), userController.rejectAccountRequest);
router.patch('/:id/branch', authMiddleware, requireRole('Admin Pusat'), validateBody(updateUserBranchSchema), userController.updateUserBranch);
router.delete('/:id', authMiddleware, requireRole('Admin Pusat'), userController.deleteUser);
router.get('/password-approvals', authMiddleware, requireRole('Admin Pusat'), userController.getPasswordApprovals);
router.get('/password-approvals/:id', authMiddleware, requireRole('Admin Pusat'), userController.getPasswordApprovalById);
router.patch('/password-approvals/:id/approve', authMiddleware, requireRole('Admin Pusat'), userController.approvePasswordRequest);
router.patch('/password-approvals/:id/reject', authMiddleware, requireRole('Admin Pusat'), userController.rejectPasswordRequest);

export default router;
