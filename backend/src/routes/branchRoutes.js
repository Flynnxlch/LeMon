import { Router } from 'express';
import * as branchController from '../controllers/branchController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createBranchSchema } from '../validators/branch.js';

const router = Router();

router.get('/public', branchController.getBranches);
router.get('/', authMiddleware, branchController.getBranches);
router.get('/:id', authMiddleware, branchController.getBranchById);
router.post('/', authMiddleware, requireRole('Admin Pusat'), validateBody(createBranchSchema), branchController.createBranch);
router.delete('/:id', authMiddleware, requireRole('Admin Pusat'), branchController.deleteBranch);

export default router;
