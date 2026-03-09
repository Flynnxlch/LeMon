import * as progressTrackService from '../services/progressTrackService.js';

export async function getProgressTrack(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const q = req.validatedQuery ?? req.query;
    const result = await progressTrackService.getProgressTrack({
      branchId: q.branchId,
      status: q.status,
      search: q.search,
      page: q.page ?? 1,
      limit: q.limit ?? 25,
      userRole: req.user?.role,
      userBranchId: req.user?.branchId ?? null,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
