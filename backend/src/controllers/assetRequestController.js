import * as beritaAcaraService from '../services/beritaAcaraService.js';
import * as assetRequestService from '../services/assetRequestService.js';
import * as assetService from '../services/assetService.js';

export async function getAssetRequests(req, res, next) {
  try {
    const q = req.validatedQuery ?? req.query;
    const list = await assetRequestService.getAssetRequests(q.status);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

export async function createAssetRequest(req, res, next) {
  try {
    let photoUrl = null;
    if (req.file) {
      const { url } = await assetService.uploadAssetPhoto(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      photoUrl = url;
    }
    const result = await assetRequestService.createAssetRequest(
      req.body,
      req.user.id,
      photoUrl
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function approveAssetRequest(req, res, next) {
  try {
    let photoUrl = null;
    const files = req.files || {};
    const photo = files.photo && files.photo[0];
    if (photo) {
      const { url } = await assetService.uploadAssetPhoto(
        photo.buffer,
        photo.originalname,
        photo.mimetype
      );
      photoUrl = url;
    }
    const beritaFile = files.beritaAcara && files.beritaAcara[0];
    if (!beritaFile) {
      return res.status(400).json({ success: false, error: 'Berita Acara (PDF) wajib diunggah.' });
    }
    const { url: pdfUrl } = await assetService.uploadBeritaAcaraPdf(
      beritaFile.buffer,
      beritaFile.originalname
    );
    const result = await assetRequestService.approveAssetRequest(
      req.params.id,
      req.body,
      photoUrl
    );
    if (result.assetId) {
      await beritaAcaraService.createBeritaAcara({
        assetId: result.assetId,
        eventType: 'asset_request_approved',
        title: 'Request aset disetujui',
        pdfUrl,
        userId: req.user?.id,
      });
    }
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'Asset request not found' || err.message === 'Request already processed') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function rejectAssetRequest(req, res, next) {
  try {
    await assetRequestService.rejectAssetRequest(req.params.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) {
    if (err.message === 'Asset request not found' || err.message === 'Request already processed') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}
