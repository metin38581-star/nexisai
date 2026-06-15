import "server-only";

import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";

export interface WalletRecord {
  id: string;
  balance: number;
}

async function getOrCreateWalletViaPrisma(): Promise<WalletRecord> {
  let wallet = await prisma.wallet.findFirst();

  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { balance: 500.0 } });
  }

  return { id: wallet.id, balance: wallet.balance };
}

async function getOrCreateWalletViaSupabase(): Promise<WalletRecord> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from("Wallet")
    .select("id, balance")
    .limit(1)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (existing) {
    return { id: existing.id, balance: existing.balance };
  }

  const { data: created, error: createError } = await supabase
    .from("Wallet")
    .insert({ balance: 500.0 })
    .select("id, balance")
    .single();

  if (createError) {
    throw createError;
  }

  return { id: created.id, balance: created.balance };
}

export async function getOrCreateWallet(): Promise<WalletRecord> {
  if (hasDatabaseUrl()) {
    try {
      return await getOrCreateWalletViaPrisma();
    } catch (error) {
      console.error("API Hatası:", error);
    }
  }

  return getOrCreateWalletViaSupabase();
}

export async function incrementWalletBalance(
  walletId: string,
  amount: number,
): Promise<number> {
  if (hasDatabaseUrl()) {
    try {
      const updated = await prisma.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amount } },
      });
      return updated.balance;
    } catch (error) {
      console.error("API Hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  const { data: wallet, error: readError } = await supabase
    .from("Wallet")
    .select("balance")
    .eq("id", walletId)
    .single();

  if (readError) {
    throw readError;
  }

  const nextBalance = wallet.balance + amount;
  const { data: updated, error: updateError } = await supabase
    .from("Wallet")
    .update({ balance: nextBalance, updatedAt: new Date().toISOString() })
    .eq("id", walletId)
    .select("balance")
    .single();

  if (updateError) {
    throw updateError;
  }

  return updated.balance;
}

export async function decrementWalletBalance(
  walletId: string,
  amount: number,
): Promise<number> {
  if (hasDatabaseUrl()) {
    try {
      const updated = await prisma.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } },
      });
      return updated.balance;
    } catch (error) {
      console.error("API Hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  const { data: wallet, error: readError } = await supabase
    .from("Wallet")
    .select("balance")
    .eq("id", walletId)
    .single();

  if (readError) {
    throw readError;
  }

  const nextBalance = wallet.balance - amount;
  const { data: updated, error: updateError } = await supabase
    .from("Wallet")
    .update({ balance: nextBalance, updatedAt: new Date().toISOString() })
    .eq("id", walletId)
    .select("balance")
    .single();

  if (updateError) {
    throw updateError;
  }

  return updated.balance;
}
