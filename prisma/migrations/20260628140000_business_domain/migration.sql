ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "business_domain" TEXT;

ALTER TABLE "CampaignLog" ADD COLUMN IF NOT EXISTS "primary_authority_url" TEXT;
ALTER TABLE "CampaignLog" ADD COLUMN IF NOT EXISTS "business_domain" TEXT;
