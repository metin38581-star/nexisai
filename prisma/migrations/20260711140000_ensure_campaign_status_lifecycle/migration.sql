-- Idempotent prod fix: Campaign.status / lifecycle kolonları (P2022)
-- Güvenli tekrar çalıştırma: IF NOT EXISTS + NULL backfill

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "total_paid" DOUBLE PRECISION;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP(3);

UPDATE "Campaign"
SET "status" = 'active'
WHERE "status" IS NULL OR TRIM("status") = '';

UPDATE "Campaign"
SET "start_date" = "createdAt"
WHERE "start_date" IS NULL;

UPDATE "Campaign"
SET "end_date" = "createdAt" + (GREATEST("gunSayisi", 1) * INTERVAL '1 day')
WHERE "end_date" IS NULL;

ALTER TABLE "Campaign" ALTER COLUMN "status" SET DEFAULT 'pending_payment';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Campaign'
      AND column_name = 'status'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "Campaign" ALTER COLUMN "status" SET NOT NULL;
  END IF;
END $$;

ALTER TABLE "IyzicoCheckout" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
CREATE INDEX IF NOT EXISTS "IyzicoCheckout_campaignId_idx" ON "IyzicoCheckout"("campaignId");

NOTIFY pgrst, 'reload schema';
