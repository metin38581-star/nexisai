-- NexisAI Hub — hibrid yayın mimarisi (Supabase SQL Editor)
-- Prisma tablo adları: "Campaign", "Bait"

-- Makale (Bait) tablosu — NexisAI Hub slug + dış platform linki
ALTER TABLE "Bait"
ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE "Bait"
ADD COLUMN IF NOT EXISTS external_live_url TEXT;

-- Mevcut kayıtlar için geçici slug (Prisma @unique zorunluluğu öncesi)
UPDATE "Bait"
SET slug = 'legacy-' || id
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS "Bait_slug_key"
ON "Bait" ("slug")
WHERE slug IS NOT NULL;

-- İsteğe bağlı: kampanya düzeyinde dış link
ALTER TABLE "Campaign"
ADD COLUMN IF NOT EXISTS external_live_url TEXT;
