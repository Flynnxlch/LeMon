import * as reassignmentRequestService from '../services/reassignmentRequestService.js';

export async function getReassignmentRequests(req, res, next) {
  try {
    const q = req.validatedQuery ?? req.query;
    const list = await reassignmentRequestService.getReassignmentRequests(q.status);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

export async function createReassignmentRequest(req, res, next) {
  try {
    const result = await reassignmentRequestService.createReassignmentRequest(
      req.body,
      req.user.id,
      req.user.role,
      req.user.branchId
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.message === 'Asset not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Forbidden') {
      return res.status(403).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function approveReassignmentRequest(req, res, next) {
  try {
    await reassignmentRequestService.approveReassignmentRequest(req.params.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'Reassignment request not found' || err.message === 'Request already processed') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function rejectReassignmentRequest(req, res, next) {
  try {
    await reassignmentRequestService.rejectReassignmentRequest(req.params.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'Reassignment request not found' || err.message === 'Request already processed') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}
