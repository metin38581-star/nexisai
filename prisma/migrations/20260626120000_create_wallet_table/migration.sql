-- Wallet tablosu (Supabase auth user id = primary key)
CREATE TABLE IF NOT EXISTS "Wallet" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
