-- Add title column to BeritaAcara (migration applied previously to DB)
ALTER TABLE "BeritaAcara" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT 'Berita Acara';
