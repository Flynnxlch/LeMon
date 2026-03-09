import * as beritaAcaraService from '../services/beritaAcaraService.js';
import * as assetService from '../services/assetService.js';
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
    const beritaFile = req.file || (req.files && req.files.beritaAcara && req.files.beritaAcara[0]);
    if (!beritaFile) {
      return res.status(400).json({ success: false, error: 'Berita Acara (PDF) wajib diunggah.' });
    }
    const { url: pdfUrl } = await assetService.uploadBeritaAcaraPdf(
      beritaFile.buffer,
      beritaFile.originalname
    );
    const tr = await transferRequestService.getTransferRequestById(req.params.id);
    if (!tr) {
      return res.status(400).json({ success: false, error: 'Transfer request not found' });
    }
    await transferRequestService.approveTransferRequest(req.params.id);
    await beritaAcaraService.createBeritaAcara({
      assetId: tr.assetId,
      eventType: 'transfer_approved',
      title: 'Request transfer aset disetujui',
      pdfUrl,
      referenceId: req.params.id,
      userId: req.user?.id,
    });
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
    const beritaFile = req.file || (req.files && req.files.beritaAcara && req.files.beritaAcara[0]);
    if (beritaFile && req.body.assetId) {
      try {
        const { url: pdfUrl } = await assetService.uploadBeritaAcaraPdf(
          beritaFile.buffer,
          beritaFile.originalname
        );
        await beritaAcaraService.createBeritaAcara({
          assetId: req.body.assetId,
          eventType: 'transfer_approved',
          title: 'Transfer langsung aset',
          pdfUrl,
          userId: req.user?.id,
        });
      } catch (uploadErr) {
        console.warn('Berita Acara upload failed:', uploadErr?.message);
      }
    }
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
