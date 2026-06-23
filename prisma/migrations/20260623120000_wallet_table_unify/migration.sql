-- Wallet tablosunu kullanici bazli cuzdan alanlariyla hizala (UserWallet yerine)
ALTER TABLE "Wallet" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Wallet" ADD COLUMN IF NOT EXISTS "welcome_granted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Wallet" ADD COLUMN IF NOT EXISTS "has_paid_top_up" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Wallet" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_userId_key" ON "Wallet"("userId");

-- UserWallet varsa veriyi Wallet'a tasit
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'UserWallet'
  ) THEN
    INSERT INTO "Wallet" ("id", "userId", "balance", "welcome_granted", "has_paid_top_up", "createdAt", "updatedAt")
    SELECT uw."id", uw."userId", uw."balance", uw."welcome_granted", uw."has_paid_top_up", uw."createdAt", uw."updatedAt"
    FROM "UserWallet" uw
    WHERE NOT EXISTS (
      SELECT 1 FROM "Wallet" w WHERE w."userId" = uw."userId"
    );

    DROP TABLE "UserWallet";
  END IF;
END $$;
