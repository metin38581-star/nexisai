-- Wallet: id = Supabase auth user uuid (mevcut tablo: id, balance, updatedAt)
-- userId kolonu kullanilmiyor; sorgular prisma.wallet.findUnique({ where: { id } })

-- UserWallet varsa veriyi Wallet.id = userId olacak sekilde tasit
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'UserWallet'
  ) THEN
    INSERT INTO "Wallet" ("id", "balance", "updatedAt")
    SELECT uw."userId", uw."balance", uw."updatedAt"
    FROM "UserWallet" uw
    ON CONFLICT ("id") DO UPDATE SET
      "balance" = EXCLUDED."balance",
      "updatedAt" = EXCLUDED."updatedAt";

    DROP TABLE "UserWallet";
  END IF;
END $$;
