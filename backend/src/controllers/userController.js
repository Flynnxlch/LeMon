import * as authService from '../services/authService.js';
import * as userService from '../services/userService.js';

export async function getUsers(req, res, next) {
  try {
    const filters = {};
    if (req.query.branchId) filters.branchId = req.query.branchId;
    if (req.query.role) filters.role = req.query.role;
    const list = await userService.getUsers(filters);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

export async function getAccountRequests(req, res, next) {
  try {
    const list = await userService.getAccountRequests(req.query.status);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

export async function createAccountRequest(req, res, next) {
  try {
    const hash = await authService.hashPassword(req.body.password);
    const { password, ...rest } = req.body;
    const result = await userService.createAccountRequest(rest, hash);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.message?.includes('pending account request')) {
      return res.status(409).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function approveAccountRequest(req, res, next) {
  try {
    const { id } = req.params;
    const passwordHash = req.body?.password ? await (await import('../services/authService.js')).hashPassword(req.body.password) : undefined;
    const result = await userService.approveAccountRequest(id, req.user.id, {
      passwordHash,
      branchId: req.body.branchId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message === 'Account request not found' || err.message === 'Request already processed' || err.message === 'Branch must be assigned when approving') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function rejectAccountRequest(req, res, next) {
  try {
    await userService.rejectAccountRequest(req.params.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'Account request not found' || err.message === 'Request already processed') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function updateUserBranch(req, res, next) {
  try {
    const { id } = req.params;
    const { branchId } = req.body;
    await userService.updateUserBranch(id, branchId || null, req.user.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'User not found' || err.message === 'Branch not found' || err.message === 'Cannot update your own branch') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    await userService.deleteUser(id, req.user.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'User not found' || err.message === 'Cannot delete your own account' || err.message?.includes('Cannot delete user')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function getPasswordApprovals(req, res, next) {
  try {
    const status = req.query.status || 'Pending';
    const list = await userService.getPasswordApprovals(status);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

export async function getPasswordApprovalById(req, res, next) {
  try {
    const detail = await userService.getPasswordApprovalById(req.params.id);
    if (!detail) {
      return res.status(404).json({ success: false, error: 'Password change request not found' });
    }
    res.json({ success: true, data: detail });
  } catch (err) {
    next(err);
  }
}

export async function approvePasswordRequest(req, res, next) {
  try {
    await userService.approvePasswordRequest(req.params.id, req.user.id);
    res.json({ success: true, data: { ok: true }, message: 'Password updated successfully.' });
  } catch (err) {
    if (err.message === 'Password change request not found' || err.message === 'Request already processed') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function rejectPasswordRequest(req, res, next) {
  try {
    await userService.rejectPasswordRequest(req.params.id, req.user.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'Password change request not found' || err.message === 'Request already processed') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}
