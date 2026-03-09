import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

let supabaseAdmin = null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const { url, serviceRoleKey } = config.supabase;
    if (!url || !serviceRoleKey) {
      throw new Error('Supabase URL and SUPABASE_SERVICE_ROLE_KEY must be set for file uploads');
    }
    supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseAdmin;
}

const BUCKET = 'asset-photos';
// Buat bucket "berita-acara" di Supabase Dashboard (Storage) jika belum ada. Policy: public read untuk tampilan PDF.
const BUCKET_BERITA_ACARA = 'berita-acara';

/** Max size for Berita Acara PDF (500KB). */
export const BERITA_ACARA_MAX_BYTES = 500 * 1024;

/**
 * Upload a file buffer to Supabase Storage. Use from backend only (service role).
 * @param {Buffer} fileBuffer - File content
 * @param {string} fileName - Unique file name (e.g. uuid + extension)
 * @param {string} mimeType - e.g. image/jpeg
 * @returns {Promise<{ url: string, path: string }>} Public URL and storage path
 */
export async function uploadToSupabase(fileBuffer, fileName, mimeType) {
  const supabase = getSupabaseAdmin();
  const path = `${Date.now()}-${fileName}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return { url: urlData.publicUrl, path: data.path };
}

/**
 * Upload PDF (Berita Acara) to bucket berita-acara. Max size 500KB.
 * @param {Buffer} fileBuffer - PDF content
 * @param {string} fileName - Unique file name (e.g. uuid.pdf)
 * @returns {Promise<{ url: string, path: string }>} Public URL and storage path
 */
export async function uploadBeritaAcaraPdf(fileBuffer, fileName) {
  if (fileBuffer.length > BERITA_ACARA_MAX_BYTES) {
    throw new Error(`Berita Acara PDF maksimal ${BERITA_ACARA_MAX_BYTES / 1024}KB. Ukuran saat ini: ${(fileBuffer.length / 1024).toFixed(1)}KB.`);
  }
  const supabase = getSupabaseAdmin();
  const safeName = (fileName || 'berita-acara.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = safeName.endsWith('.pdf') ? `${Date.now()}-${safeName}` : `${Date.now()}-${safeName}.pdf`;
  const { data, error } = await supabase.storage
    .from(BUCKET_BERITA_ACARA)
    .upload(path, fileBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
  if (error) {
    throw new Error(`Storage upload Berita Acara failed: ${error.message}`);
  }
  const { data: urlData } = supabase.storage.from(BUCKET_BERITA_ACARA).getPublicUrl(data.path);
  return { url: urlData.publicUrl, path: data.path };
}

const PUBLIC_PATH_PREFIX = `/storage/v1/object/public/${BUCKET}/`;

/**
 * Extract storage path from a Supabase public URL.
 * @param {string} url - Full public URL (e.g. from getPublicUrl)
 * @returns {string|null} Storage path or null if not our bucket URL
 */
export function urlToStoragePath(url) {
  if (!url || typeof url !== 'string') return null;
  const i = url.indexOf(PUBLIC_PATH_PREFIX);
  if (i === -1) return null;
  return url.slice(i + PUBLIC_PATH_PREFIX.length).replace(/^\/+/, '');
}

/**
 * Delete file from Supabase Storage by path.
 */
export async function deleteFromSupabase(path) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

/**
 * Delete multiple files from Supabase Storage. Ignores null/empty paths.
 * Logs but does not throw on individual failures so remaining files can still be removed.
 */
export async function deleteManyFromSupabase(paths) {
  const valid = paths.filter(Boolean);
  if (valid.length === 0) return;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).remove(valid);
  if (error) {
    console.warn('[Supabase] deleteManyFromSupabase failed:', error.message);
  }
}
