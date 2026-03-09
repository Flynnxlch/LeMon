import { uploadConditionPhotoUrls } from '../middleware/upload.js';
import * as assetHistoryService from '../services/assetHistoryService.js';
import * as assetService from '../services/assetService.js';
import * as beritaAcaraService from '../services/beritaAcaraService.js';
import * as repairService from '../services/repairService.js';

export async function getAssets(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const q = req.validatedQuery ?? req.query;
    const filters = {
      branchId: q.branchId,
      status: q.status,
      excludeDeleted: q.excludeDeleted,
      contract: q.contract,
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

export async function getAssetHistory(req, res, next) {
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
    const history = await assetHistoryService.getHistoryByAssetId(req.params.id);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

export async function getAssetBeritaAcara(req, res, next) {
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
    const list = await beritaAcaraService.getByAssetId(req.params.id);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

export async function createAsset(req, res, next) {
  try {
    let photoUrl = null;
    const photo = req.file;
    if (photo) {
      try {
        const { url } = await assetService.uploadAssetPhoto(
          photo.buffer,
          photo.originalname,
          photo.mimetype
        );
        photoUrl = url;
      } catch (uploadErr) {
        console.warn('Asset photo upload failed:', uploadErr?.message);
      }
    }
    const result = await assetService.createAsset(req.body, photoUrl, req.user?.id);
    const beritaFile = req.beritaAcaraFile;
    if (beritaFile) {
      try {
        const { url: pdfUrl } = await assetService.uploadBeritaAcaraPdf(
          beritaFile.buffer,
          beritaFile.originalname
        );
        await beritaAcaraService.createBeritaAcara({
          assetId: result.id,
          eventType: 'asset_create',
          title: 'Aset baru ditambahkan',
          pdfUrl,
          userId: req.user?.id,
        });
      } catch (uploadErr) {
        console.warn('Berita Acara upload failed:', uploadErr?.message);
      }
    }
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateAsset(req, res, next) {
  try {
    let payload = { ...req.body };
    const conditionPhotos = Array.isArray(req.files) ? req.files : [];
    if (conditionPhotos.length > 0) {
      const urls = await uploadConditionPhotoUrls({ ...req, files: conditionPhotos });
      payload.updateImages = urls;
    }
    if (payload.latitude !== undefined) payload.latitude = Number(payload.latitude);
    if (payload.longitude !== undefined) payload.longitude = Number(payload.longitude);
    const result = await assetService.updateAsset(
      req.params.id,
      payload,
      req.user.role,
      req.user.branchId,
      req.user.id
    );
    const beritaFile = req.beritaAcaraFile;
    if (beritaFile) {
      try {
        const { url: pdfUrl } = await assetService.uploadBeritaAcaraPdf(
          beritaFile.buffer,
          beritaFile.originalname
        );
        const eventType = payload.status !== undefined ? 'status_change' : 'condition_update';
        const title =
          payload.status !== undefined
            ? `Perubahan status aset`
            : `Update kondisi aset`;
        await beritaAcaraService.createBeritaAcara({
          assetId: req.params.id,
          eventType,
          title,
          pdfUrl,
          userId: req.user?.id,
        });
      } catch (uploadErr) {
        console.warn('Berita Acara upload failed:', uploadErr?.message);
      }
    }
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
    const conditionPhotos = Array.isArray(req.files) ? req.files : [];
    if (conditionPhotos.length > 0) {
      const urls = await uploadConditionPhotoUrls({ ...req, files: conditionPhotos });
      payload.updateImages = urls;
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
    const beritaFile = req.beritaAcaraFile;
    if (beritaFile) {
      try {
        const { url: pdfUrl } = await assetService.uploadBeritaAcaraPdf(
          beritaFile.buffer,
          beritaFile.originalname
        );
        const title = `Asset di Assign ke: ${payload.holderFullName ?? '—'}`;
        await beritaAcaraService.createBeritaAcara({
          assetId: req.params.id,
          eventType: 'assigned',
          title,
          pdfUrl,
          userId: req.user?.id,
        });
      } catch (uploadErr) {
        console.warn('Berita Acara upload failed:', uploadErr?.message);
      }
    }
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

export async function getAssetRepair(req, res, next) {
  try {
    const repair = await repairService.getActiveRepairByAssetId(req.params.id);
    res.json({ success: true, data: repair });
  } catch (err) {
    next(err);
  }
}

export async function startRepair(req, res, next) {
  try {
    const result = await repairService.startRepair(
      req.params.id,
      req.body,
      req.user.role,
      req.user.id
    );
    const beritaFile = req.file || (req.files && req.files.beritaAcara && req.files.beritaAcara[0]);
    if (beritaFile) {
      try {
        const { url: pdfUrl } = await assetService.uploadBeritaAcaraPdf(
          beritaFile.buffer,
          beritaFile.originalname
        );
        await beritaAcaraService.createBeritaAcara({
          assetId: req.params.id,
          eventType: 'repair_started',
          title: 'Perbaikan aset dimulai',
          pdfUrl,
          userId: req.user?.id,
        });
      } catch (uploadErr) {
        console.warn('Berita Acara upload failed:', uploadErr?.message);
      }
    }
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message === 'Asset not found' || err.message === 'Asset must have status Rusak to start repair') {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err.message === 'Only Admin Pusat can start repair') {
      return res.status(403).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function completeRepair(req, res, next) {
  try {
    let payload = { ...req.body };
    const conditionPhotos = Array.isArray(req.files) ? req.files : [];
    if (conditionPhotos.length > 0) {
      const urls = await uploadConditionPhotoUrls({ ...req, files: conditionPhotos });
      payload.updateImages = urls;
    }
    if (payload.latitude !== undefined && payload.latitude !== '') payload.latitude = Number(payload.latitude);
    if (payload.longitude !== undefined && payload.longitude !== '') payload.longitude = Number(payload.longitude);
    if (payload.returnToPreviousUser === 'true') payload.returnToPreviousUser = true;
    if (payload.returnToPreviousUser === 'false') payload.returnToPreviousUser = false;
    const result = await repairService.completeRepair(
      req.params.id,
      payload,
      req.user.role,
      req.user.id
    );
    const beritaFile = req.beritaAcaraFile;
    if (beritaFile) {
      try {
        const { url: pdfUrl } = await assetService.uploadBeritaAcaraPdf(
          beritaFile.buffer,
          beritaFile.originalname
        );
        const title = payload.holderFullName
          ? `Selesai perbaikan – dikembalikan ke: ${payload.holderFullName}`
          : 'Selesai perbaikan aset';
        await beritaAcaraService.createBeritaAcara({
          assetId: req.params.id,
          eventType: 'repair_completed',
          title,
          pdfUrl,
          userId: req.user?.id,
        });
      } catch (uploadErr) {
        console.warn('Berita Acara upload failed:', uploadErr?.message);
      }
    }
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message === 'Asset not found' || err.message === 'Asset must have status Dalam Perbaikan to complete repair' || err.message === 'No active repair record found for this asset' || err.message === 'Condition photos: minimum 1, maximum 4' || err.message === 'Holder name is required when reassigning') {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err.message === 'Only Admin Pusat can complete repair') {
      return res.status(403).json({ success: false, error: err.message });
    }
    next(err);
  }
}
