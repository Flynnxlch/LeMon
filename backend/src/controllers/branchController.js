import * as branchService from '../services/branchService.js';

export async function getBranches(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const list = await branchService.getBranches();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

export async function getBranchById(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const branch = await branchService.getBranchById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }
    res.json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
}

export async function createBranch(req, res, next) {
  try {
    const result = await branchService.createBranch(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteBranch(req, res, next) {
  try {
    await branchService.deleteBranch(req.params.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'Branch not found' || err.message?.includes('Cannot delete branch')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function updateBranch(req, res, next) {
  try {
    const result = await branchService.updateBranch(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.code === 'P2025' || err.message === 'Branch not found') {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }
    next(err);
  }
}
