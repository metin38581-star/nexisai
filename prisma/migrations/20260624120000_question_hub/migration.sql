-- Merkezi Soru-Cevap (Forum Hub) tabloları
CREATE TABLE IF NOT EXISTS "QuestionHub" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "question" TEXT NOT NULL,
  "core_question_id" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "QuestionHub_core_question_id_idx"
  ON "QuestionHub"("core_question_id");

CREATE TABLE IF NOT EXISTS "HubAnswer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "question_id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "upvotes" INTEGER NOT NULL DEFAULT 0,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "HubAnswer_question_id_is_featured_createdAt_idx"
  ON "HubAnswer"("question_id", "is_featured", "createdAt");

CREATE INDEX IF NOT EXISTS "HubAnswer_campaign_id_idx"
  ON "HubAnswer"("campaign_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'HubAnswer_question_id_fkey'
  ) THEN
    ALTER TABLE "HubAnswer"
      ADD CONSTRAINT "HubAnswer_question_id_fkey"
      FOREIGN KEY ("question_id") REFERENCES "QuestionHub"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'HubAnswer question FK atlanadi: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'HubAnswer_campaign_id_fkey'
  ) THEN
    ALTER TABLE "HubAnswer"
      ADD CONSTRAINT "HubAnswer_campaign_id_fkey"
      FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'HubAnswer campaign FK atlanadi: %', SQLERRM;
END $$;
