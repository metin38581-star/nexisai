-- Supabase SQL Editor: prod şema kod ile uyumsuzsa bu dosyayı çalıştırın.
-- Ardından: Dashboard → Settings → API → "Reload schema" (veya alttaki NOTIFY).

-- Campaign eksik kolonlar
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "wordpress_url" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "business_domain" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "live_url" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "external_live_url" TEXT;

-- Bait: multi-tenant user_id
ALTER TABLE "Bait" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

UPDATE "Bait" AS b
SET "user_id" = c."userId"
FROM "Campaign" AS c
WHERE b."campaignId" = c."id"
  AND b."user_id" IS NULL;

DELETE FROM "Bait"
WHERE "user_id" IS NULL;

ALTER TABLE "Bait" ALTER COLUMN "user_id" SET NOT NULL;

DROP INDEX IF EXISTS "Bait_slug_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Bait_campaignId_slug_key"
  ON "Bait"("campaignId", "slug");

CREATE INDEX IF NOT EXISTS "Bait_user_id_idx" ON "Bait"("user_id");
CREATE INDEX IF NOT EXISTS "Bait_campaignId_idx" ON "Bait"("campaignId");

-- Bait: yayın URL kolonları
ALTER TABLE "Bait" ADD COLUMN IF NOT EXISTS "wp_url" TEXT;
ALTER TABLE "Bait" ADD COLUMN IF NOT EXISTS "blog_url" TEXT;
ALTER TABLE "Bait" ADD COLUMN IF NOT EXISTS "forum_url" TEXT;
ALTER TABLE "Bait" ADD COLUMN IF NOT EXISTS "dev_to_url" TEXT;
ALTER TABLE "Bait" ADD COLUMN IF NOT EXISTS "live_url" TEXT;
ALTER TABLE "Bait" ADD COLUMN IF NOT EXISTS "external_live_url" TEXT;

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "status" TEXT;
UPDATE "Campaign"
SET "status" = 'active'
WHERE "status" IS NULL OR TRIM("status") = '';
ALTER TABLE "Campaign" ALTER COLUMN "status" SET DEFAULT 'pending_payment';
ALTER TABLE "Campaign" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "total_paid" DOUBLE PRECISION;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP(3);

UPDATE "Campaign"
SET "start_date" = "createdAt"
WHERE "start_date" IS NULL;

UPDATE "Campaign"
SET "end_date" = "createdAt" + (GREATEST("gunSayisi", 1) * INTERVAL '1 day')
WHERE "end_date" IS NULL;

ALTER TABLE "IyzicoCheckout" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
CREATE INDEX IF NOT EXISTS "IyzicoCheckout_campaignId_idx" ON "IyzicoCheckout"("campaignId");

NOTIFY pgrst, 'reload schema';
