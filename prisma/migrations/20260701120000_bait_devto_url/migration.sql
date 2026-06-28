-- Bait: Dev.to doğrudan yayın canlı link alanı
ALTER TABLE "Bait" ADD COLUMN IF NOT EXISTS "dev_to_url" TEXT;
