-- UserWallet
CREATE TABLE IF NOT EXISTS "UserWallet" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "welcome_granted" BOOLEAN NOT NULL DEFAULT false,
  "has_paid_top_up" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RegisteredBusiness
CREATE TABLE IF NOT EXISTS "RegisteredBusiness" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "business_name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL UNIQUE,
  "created_by_user_id" TEXT NOT NULL,
  "is_trial_used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OtpVerification
CREATE TABLE IF NOT EXISTS "OtpVerification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'register',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "OtpVerification_email_purpose_idx" ON "OtpVerification"("email", "purpose");

-- CampaignGrowthLoop
CREATE TABLE IF NOT EXISTS "CampaignGrowthLoop" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "email_scheduled_at" TIMESTAMP(3) NOT NULL,
  "email_sent_at" TIMESTAMP(3),
  "scores_updated_at" TIMESTAMP(3),
  "question_scores" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignGrowthLoop_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- IyzicoCheckout
CREATE TABLE IF NOT EXISTS "IyzicoCheckout" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "token" TEXT UNIQUE,
  "conversation_id" TEXT UNIQUE,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "campaign_draft" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
