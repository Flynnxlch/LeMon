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
