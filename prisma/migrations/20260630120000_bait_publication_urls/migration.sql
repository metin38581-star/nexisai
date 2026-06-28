-- Bait: platform bazlı canlı yayın URL alanları
ALTER TABLE "Bait" ADD COLUMN IF NOT EXISTS "wp_url" TEXT;
ALTER TABLE "Bait" ADD COLUMN IF NOT EXISTS "blog_url" TEXT;
ALTER TABLE "Bait" ADD COLUMN IF NOT EXISTS "forum_url" TEXT;
