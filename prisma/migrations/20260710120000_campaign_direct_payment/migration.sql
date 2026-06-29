-- Direct iyzico campaign payment model (wallet bypass for campaigns)

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "total_paid" DOUBLE PRECISION;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP(3);

UPDATE "Campaign"
SET "start_date" = "createdAt"
WHERE "start_date" IS NULL;

UPDATE "Campaign"
SET "end_date" = "createdAt" + (GREATEST("gunSayisi", 1) * INTERVAL '1 day')
WHERE "end_date" IS NULL;

UPDATE "Campaign"
SET "status" = 'active'
WHERE "status" IS NULL OR TRIM("status") = '';

ALTER TABLE "IyzicoCheckout" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
CREATE INDEX IF NOT EXISTS "IyzicoCheckout_campaignId_idx" ON "IyzicoCheckout"("campaignId");
