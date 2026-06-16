-- MarketIntelligence (7 günlük pazar sorgusu önbelleği)
CREATE TABLE IF NOT EXISTS "MarketIntelligence" (
    "id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketIntelligence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketIntelligence_sector_city_key"
ON "MarketIntelligence"("sector", "city");

-- CampaignRadarLog (15 dk agresif radar zaman serisi)
CREATE TABLE IF NOT EXISTS "CampaignRadarLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "scanResult" JSONB NOT NULL,
    "shareOfVoice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRadarLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CampaignRadarLog_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CampaignRadarLog_campaignId_createdAt_idx"
ON "CampaignRadarLog"("campaignId", "createdAt" DESC);
