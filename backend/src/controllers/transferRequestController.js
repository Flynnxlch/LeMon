import * as transferRequestService from '../services/transferRequestService.js';

export async function getTransferRequests(req, res, next) {
  try {
    const q = req.validatedQuery ?? req.query;
    const list = await transferRequestService.getTransferRequests(q.status);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

export async function createTransferRequest(req, res, next) {
  try {
    const result = await transferRequestService.createTransferRequest(
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

export async function approveTransferRequest(req, res, next) {
  try {
    await transferRequestService.approveTransferRequest(req.params.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'Transfer request not found' || err.message === 'Request already processed') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function rejectTransferRequest(req, res, next) {
  try {
    await transferRequestService.rejectTransferRequest(req.params.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'Transfer request not found' || err.message === 'Request already processed') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function directTransfer(req, res, next) {
  try {
    await transferRequestService.directTransfer(req.body);
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'Asset not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Cannot transfer to the same branch') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}
