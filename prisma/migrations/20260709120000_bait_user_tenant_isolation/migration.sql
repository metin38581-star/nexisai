-- Multi-tenant isolation: Bait rows must belong to the creating user and campaign.

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
