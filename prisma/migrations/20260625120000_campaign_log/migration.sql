-- CampaignLog: SuperAdmin merkezi veri takip tablosu
CREATE TABLE IF NOT EXISTS "CampaignLog" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "user_email" TEXT NOT NULL,
  "business_name" TEXT NOT NULL,
  "sector" TEXT NOT NULL,
  "sector_label" TEXT,
  "city" TEXT NOT NULL,
  "wallet_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amount_spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amount_deposited" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "wordpress_url" TEXT,
  "forum_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CampaignLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CampaignLog_campaign_id_key" ON "CampaignLog"("campaign_id");
CREATE INDEX IF NOT EXISTS "CampaignLog_user_id_idx" ON "CampaignLog"("user_id");
CREATE INDEX IF NOT EXISTS "CampaignLog_city_idx" ON "CampaignLog"("city");
CREATE INDEX IF NOT EXISTS "CampaignLog_sector_idx" ON "CampaignLog"("sector");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CampaignLog_campaign_id_fkey'
  ) THEN
    ALTER TABLE "CampaignLog"
      ADD CONSTRAINT "CampaignLog_campaign_id_fkey"
      FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
