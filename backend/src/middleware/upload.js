import multer from 'multer';
import config from '../config/index.js';
import { BERITA_ACARA_MAX_BYTES } from '../lib/supabase.js';
import * as assetService from '../services/assetService.js';

/** Upload req.files to Supabase and return array of public URLs. */
export async function uploadConditionPhotoUrls(req) {
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
  return urls;
}

const storage = multer.memoryStorage();
const limits = { fileSize: config.uploadMaxSize };

// FIX [F004]: Magic-byte signatures to reduce spoofed mimetype risk (client can send wrong Content-Type)
const MAGIC = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF; WebP has "WEBP" at offset 8, checked below
};
const WEBP_AT_8 = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

function checkMagic(buffer, mimetype) {
  if (!buffer || buffer.length < 12) return false;
  const u8 = new Uint8Array(buffer);
  if (mimetype === 'image/webp') {
    const riff = MAGIC['image/webp'][0].every((byte, i) => u8[i] === byte);
    return riff && WEBP_AT_8.every((byte, i) => u8[8 + i] === byte);
  }
  const sigs = MAGIC[mimetype];
  if (!sigs) return false;
  return sigs.some((sig) => sig.every((byte, i) => u8[i] === byte));
}

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP'), false);
  }
};

/** FIX [F004]: After multer, validate file content by magic bytes (single file). */
export function validateImageMagicSingle(req, res, next) {
  if (!req.file) return next();
  const ok = checkMagic(req.file.buffer, req.file.mimetype);
  if (!ok) {
    return res.status(400).json({ success: false, error: 'File content does not match declared image type. Allowed: JPEG, PNG, GIF, WebP.' });
  }
  next();
}

/** FIX [F004]: After multer, validate file content by magic bytes (array of files). */
export function validateImageMagicArray(req, res, next) {
  const files = req.files && Array.isArray(req.files) ? req.files : [];
  for (const file of files) {
    if (!checkMagic(file.buffer, file.mimetype)) {
      return res.status(400).json({ success: false, error: 'File content does not match declared image type. Allowed: JPEG, PNG, GIF, WebP.' });
    }
  }
  next();
}

export const uploadSingle = multer({
  storage,
  limits,
  fileFilter,
}).single('photo');

/** Up to 4 condition photos for assign/update condition. Field name: "photos". */
export const uploadConditionPhotos = multer({
  storage,
  limits: { ...limits, fileSize: config.uploadMaxSize },
  fileFilter,
}).array('photos', 4);

// ─── Berita Acara (PDF only, max 500KB) ─────────────────────────────────────
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

function checkPdfMagic(buffer) {
  if (!buffer || buffer.length < 4) return false;
  const u8 = new Uint8Array(buffer);
  return PDF_MAGIC.every((byte, i) => u8[i] === byte);
}

const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Hanya file PDF yang diperbolehkan untuk Berita Acara.'), false);
  }
};

/** Single PDF for Berita Acara. Field name: "beritaAcara". Max 500KB. */
export const uploadBeritaAcaraPdf = multer({
  storage,
  limits: { fileSize: BERITA_ACARA_MAX_BYTES },
  fileFilter: pdfFileFilter,
}).single('beritaAcara');

/** After multer: validate PDF magic bytes and require file (for single beritaAcara). */
export function validateBeritaAcaraPdf(req, res, next) {
  const file = req.file || (req.files && req.files.beritaAcara && req.files.beritaAcara[0]);
  if (!file) {
    return res.status(400).json({ success: false, error: 'Berita Acara (PDF) wajib diunggah.' });
  }
  if (file.size > BERITA_ACARA_MAX_BYTES) {
    return res.status(400).json({
      success: false,
      error: `Berita Acara maksimal ${BERITA_ACARA_MAX_BYTES / 1024}KB. Ukuran saat ini: ${(file.size / 1024).toFixed(1)}KB.`,
    });
  }
  if (!checkPdfMagic(file.buffer)) {
    return res.status(400).json({ success: false, error: 'File bukan PDF yang valid. Hanya PDF diperbolehkan.' });
  }
  next();
}

const photoAndPdfFilter = (req, file, cb) => {
  if (file.fieldname === 'photo') {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Foto aset: hanya JPEG, PNG, GIF, WebP.'), false);
  }
  if (file.fieldname === 'beritaAcara') {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    return cb(new Error('Berita Acara: hanya PDF.'), false);
  }
  cb(null, true);
};

/** Create Asset: photo (1) + beritaAcara (1). Both required. */
export const uploadPhotoAndBeritaAcara = multer({
  storage,
  limits: { fileSize: config.uploadMaxSize },
  fileFilter: photoAndPdfFilter,
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'beritaAcara', maxCount: 1 },
]);

/** Approve asset request: photo optional, beritaAcara required. */
export function validateApproveAssetRequestFiles(req, res, next) {
  const files = req.files || {};
  const beritaAcara = files.beritaAcara && files.beritaAcara[0];
  if (!beritaAcara) {
    return res.status(400).json({ success: false, error: 'Berita Acara (PDF) wajib diunggah.' });
  }
  if (beritaAcara.size > BERITA_ACARA_MAX_BYTES) {
    return res.status(400).json({
      success: false,
      error: `Berita Acara maksimal ${BERITA_ACARA_MAX_BYTES / 1024}KB.`,
    });
  }
  if (!checkPdfMagic(beritaAcara.buffer)) {
    return res.status(400).json({ success: false, error: 'Berita Acara: file bukan PDF yang valid.' });
  }
  const photo = files.photo && files.photo[0];
  if (photo && !checkMagic(photo.buffer, photo.mimetype)) {
    return res.status(400).json({ success: false, error: 'Foto aset: file bukan gambar yang valid.' });
  }
  req.file = photo || null;
  req.beritaAcaraFile = beritaAcara;
  next();
}

/** Require both photo and beritaAcara for create asset; validate sizes and magic. */
export function validateCreateAssetFiles(req, res, next) {
  const files = req.files || {};
  const photo = files.photo && files.photo[0];
  const beritaAcara = files.beritaAcara && files.beritaAcara[0];
  if (!photo) {
    return res.status(400).json({ success: false, error: 'Foto aset wajib diunggah.' });
  }
  if (!beritaAcara) {
    return res.status(400).json({ success: false, error: 'Berita Acara (PDF) wajib diunggah.' });
  }
  if (!checkMagic(photo.buffer, photo.mimetype)) {
    return res.status(400).json({ success: false, error: 'Foto aset: file bukan gambar yang valid.' });
  }
  if (beritaAcara.size > BERITA_ACARA_MAX_BYTES) {
    return res.status(400).json({
      success: false,
      error: `Berita Acara maksimal ${BERITA_ACARA_MAX_BYTES / 1024}KB.`,
    });
  }
  if (!checkPdfMagic(beritaAcara.buffer)) {
    return res.status(400).json({ success: false, error: 'Berita Acara: file bukan PDF yang valid.' });
  }
  req.file = photo;
  req.beritaAcaraFile = beritaAcara;
  next();
}

const photosAndPdfFilter = (req, file, cb) => {
  if (file.fieldname === 'photos') {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Foto kondisi: hanya JPEG, PNG, GIF, WebP.'), false);
  }
  if (file.fieldname === 'beritaAcara') {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    return cb(new Error('Berita Acara: hanya PDF.'), false);
  }
  cb(null, true);
};

/** Assign / Update condition / Complete repair: photos (max 4) + beritaAcara (1). */
export const uploadPhotosAndBeritaAcara = multer({
  storage,
  limits: { fileSize: config.uploadMaxSize },
  fileFilter: photosAndPdfFilter,
}).fields([
  { name: 'photos', maxCount: 4 },
  { name: 'beritaAcara', maxCount: 1 },
]);

/** Validate photos array (1–4) and beritaAcara PDF for assign/update/completeRepair. */
export function validatePhotosAndBeritaAcara(req, res, next) {
  const files = req.files || {};
  const photos = files.photos || [];
  const beritaAcara = files.beritaAcara && files.beritaAcara[0];
  if (photos.length < 1 || photos.length > 4) {
    return res.status(400).json({ success: false, error: 'Foto kondisi: minimal 1, maksimal 4.' });
  }
  if (!beritaAcara) {
    return res.status(400).json({ success: false, error: 'Berita Acara (PDF) wajib diunggah.' });
  }
  for (const file of photos) {
    if (!checkMagic(file.buffer, file.mimetype)) {
      return res.status(400).json({ success: false, error: 'Foto kondisi: file bukan gambar yang valid.' });
    }
  }
  if (beritaAcara.size > BERITA_ACARA_MAX_BYTES) {
    return res.status(400).json({
      success: false,
      error: `Berita Acara maksimal ${BERITA_ACARA_MAX_BYTES / 1024}KB.`,
    });
  }
  if (!checkPdfMagic(beritaAcara.buffer)) {
    return res.status(400).json({ success: false, error: 'Berita Acara: file bukan PDF yang valid.' });
  }
  req.files = photos;
  req.beritaAcaraFile = beritaAcara;
  next();
}

/** Update asset: photos (0–4) optional, beritaAcara (1) required. */
export function validateUpdateWithBeritaAcara(req, res, next) {
  const files = req.files || {};
  const photos = files.photos || [];
  const beritaAcara = files.beritaAcara && files.beritaAcara[0];
  if (photos.length > 4) {
    return res.status(400).json({ success: false, error: 'Foto kondisi: maksimal 4.' });
  }
  if (!beritaAcara) {
    return res.status(400).json({ success: false, error: 'Berita Acara (PDF) wajib diunggah.' });
  }
  for (const file of photos) {
    if (!checkMagic(file.buffer, file.mimetype)) {
      return res.status(400).json({ success: false, error: 'Foto kondisi: file bukan gambar yang valid.' });
    }
  }
  if (beritaAcara.size > BERITA_ACARA_MAX_BYTES) {
    return res.status(400).json({
      success: false,
      error: `Berita Acara maksimal ${BERITA_ACARA_MAX_BYTES / 1024}KB.`,
    });
  }
  if (!checkPdfMagic(beritaAcara.buffer)) {
    return res.status(400).json({ success: false, error: 'Berita Acara: file bukan PDF yang valid.' });
  }
  req.files = photos;
  req.beritaAcaraFile = beritaAcara;
  next();
}
