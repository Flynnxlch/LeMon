import multer from 'multer';
import config from '../config/index.js';

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
