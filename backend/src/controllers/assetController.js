import * as assetService from '../services/assetService.js';
import config from '../config/index.js';

/** Upload req.files to Supabase and return array of public URLs. Leaves req.body unchanged. */
async function uploadConditionPhotoUrls(req) {
  const files = req.files && Array.isArray(req.files) ? req.files : [];
  if (files.length === 0) return [];
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const { url } = await assetService.uploadAssetPhoto(
        file.buffer,
        file.originalname || `photo-${i + 1}.jpg`,
        file.mimetype || 'image/jpeg'
      );
      urls.push(url);
    } catch (err) {
      console.warn('[uploadConditionPhotoUrls] file', i, 'failed:', err?.message);
    }
  }
  console.log('[uploadConditionPhotoUrls] uploaded', urls.length, 'of', files.length);
  return urls;
}

export async function getAssets(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const q = req.validatedQuery ?? req.query;
    const filters = {
      branchId: q.branchId,
      status: q.status,
      excludeDeleted: q.excludeDeleted,
    };
    const list = await assetService.getAssets(
      filters,
      req.user?.role,
      req.user?.branchId
    );
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

export async function getAssetById(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const asset = await assetService.getAssetById(
      req.params.id,
      req.user?.role,
      req.user?.branchId
    );
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    res.json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
}

export async function createAsset(req, res, next) {
  try {
    let photoUrl = null;
    if (req.file) {
      try {
        const { url } = await assetService.uploadAssetPhoto(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        photoUrl = url;
      } catch (uploadErr) {
        // Supabase/config bisa gagal; tetap buat asset tanpa foto agar data masuk DB
        console.warn('Asset photo upload failed, creating asset without photo:', uploadErr?.message);
      }
    }
    const result = await assetService.createAsset(req.body, photoUrl);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateAsset(req, res, next) {
  try {
    const result = await assetService.updateAsset(
      req.params.id,
      req.body,
      req.user.role,
      req.user.branchId
    );
    res.json({ success: true, data: result });
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

export async function deleteAsset(req, res, next) {
  try {
    await assetService.deleteAsset(
      req.params.id,
      req.user.role,
      req.user.branchId
    );
    res.json({ success: true, data: { ok: true } });
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

export async function assignAsset(req, res, next) {
  try {
    let payload = { ...req.body };
    if (req.files && req.files.length > 0) {
      const conditionImages = await uploadConditionPhotoUrls(req);
      payload.conditionImages = conditionImages;
    }
    if (payload.latitude !== undefined) payload.latitude = Number(payload.latitude);
    if (payload.longitude !== undefined) payload.longitude = Number(payload.longitude);
    const result = await assetService.assignAsset(
      req.params.id,
      payload,
      req.user.id,
      req.user.role,
      req.user.branchId
    );
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message === 'Asset not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Forbidden' || err.message === 'Only Admin Cabang can assign') {
      return res.status(403).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function updateCondition(req, res, next) {
  try {
    let payload = { ...req.body };
    if (req.files && req.files.length > 0) {
      const conditionImages = await uploadConditionPhotoUrls(req);
      payload.conditionImages = conditionImages;
    }
    if (payload.latitude !== undefined) payload.latitude = Number(payload.latitude);
    if (payload.longitude !== undefined) payload.longitude = Number(payload.longitude);
    const result = await assetService.updateAssetCondition(
      req.params.id,
      payload,
      req.user.role,
      req.user.branchId
    );
    res.json({ success: true, data: result });
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
