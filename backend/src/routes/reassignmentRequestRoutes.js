import { Router } from 'express';
import * as reassignmentRequestController from '../controllers/reassignmentRequestController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { uploadConditionPhotos, validateImageMagicArray, uploadConditionPhotoUrls } from '../middleware/upload.js';
import { createReassignmentRequestSchema, getReassignmentRequestsQuerySchema } from '../validators/reassignmentRequest.js';

const router = Router();

async function reassignmentUploadAndCoerce(req, res, next) {
  try {
    const urls = await uploadConditionPhotoUrls(req);
    if (urls.length > 0) req.body.newHolderUpdateImages = urls;
    if (req.body.newHolderLatitude !== undefined && req.body.newHolderLatitude !== '') req.body.newHolderLatitude = Number(req.body.newHolderLatitude);
    if (req.body.newHolderLongitude !== undefined && req.body.newHolderLongitude !== '') req.body.newHolderLongitude = Number(req.body.newHolderLongitude);
    next();
  } catch (err) {
    next(err);
  }
}

router.get('/', authMiddleware, validateQuery(getReassignmentRequestsQuerySchema), reassignmentRequestController.getReassignmentRequests);
router.post(
  '/',
  authMiddleware,
  requireRole('Admin Cabang'),
  uploadConditionPhotos,
  validateImageMagicArray,
  reassignmentUploadAndCoerce,
  validateBody(createReassignmentRequestSchema),
  reassignmentRequestController.createReassignmentRequest
);
router.patch('/:id/approve', authMiddleware, requireRole('Admin Pusat'), reassignmentRequestController.approveReassignmentRequest);
router.patch('/:id/reject', authMiddleware, requireRole('Admin Pusat'), reassignmentRequestController.rejectReassignmentRequest);

export default router;
