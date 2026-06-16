import "server-only";

import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";

export interface RecordPaymentInput {
  userId: string;
  amount: number;
  currency?: string;
  status?: string;
  provider?: string;
  providerStatusCode?: string | null;
  description?: string | null;
  campaignId?: string | null;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerStatusCode: string | null;
  description: string | null;
  campaignId: string | null;
  createdAt: Date;
}

async function recordPaymentViaPrisma(
  input: RecordPaymentInput,
): Promise<PaymentRecord> {
  return prisma.payment.create({
    data: {
      userId: input.userId,
      amount: input.amount,
      currency: input.currency ?? "USD",
      status: input.status ?? "success",
      provider: input.provider ?? "internal",
      providerStatusCode: input.providerStatusCode ?? null,
      description: input.description ?? null,
      campaignId: input.campaignId ?? null,
    },
  });
}

async function recordPaymentViaSupabase(
  input: RecordPaymentInput,
): Promise<PaymentRecord> {
  const supabase = getSupabaseAdmin();
  const row = {
    id: crypto.randomUUID(),
    userId: input.userId,
    amount: input.amount,
    currency: input.currency ?? "USD",
    status: input.status ?? "success",
    provider: input.provider ?? "internal",
    provider_status_code: input.providerStatusCode ?? null,
    description: input.description ?? null,
    campaignId: input.campaignId ?? null,
    createdAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("Payment")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    userId: data.userId,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    provider: data.provider,
    providerStatusCode: data.provider_status_code ?? null,
    description: data.description ?? null,
    campaignId: data.campaignId ?? null,
    createdAt: new Date(data.createdAt),
  };
}

export async function recordPayment(
  input: RecordPaymentInput,
): Promise<PaymentRecord | null> {
  try {
    if (hasDatabaseUrl()) {
      return await recordPaymentViaPrisma(input);
    }

    return await recordPaymentViaSupabase(input);
  } catch (error) {
    console.error("[PAYMENT_STORE]: Ödeme kaydı oluşturulamadı:", error);
    return null;
  }
}

async function listPaymentsByUserViaPrisma(
  userId: string,
): Promise<PaymentRecord[]> {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

async function listPaymentsByUserViaSupabase(
  userId: string,
): Promise<PaymentRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Payment")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.userId,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    providerStatusCode: row.provider_status_code ?? null,
    description: row.description ?? null,
    campaignId: row.campaignId ?? null,
    createdAt: new Date(row.createdAt),
  }));
}

export async function listPaymentsByUserId(
  userId: string,
): Promise<PaymentRecord[]> {
  if (hasDatabaseUrl()) {
    try {
      return await listPaymentsByUserViaPrisma(userId);
    } catch (error) {
      console.error("[PAYMENT_STORE]: Prisma ödeme listesi hatası:", error);
    }
  }

  return listPaymentsByUserViaSupabase(userId);
}

async function sumSuccessfulPaymentsViaPrisma(
  userId: string,
): Promise<number> {
  const result = await prisma.payment.aggregate({
    where: {
      userId,
      status: { in: ["success", "succeeded", "paid"] },
    },
    _sum: { amount: true },
  });

  return result._sum.amount ?? 0;
}

async function sumSuccessfulPaymentsViaSupabase(
  userId: string,
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Payment")
    .select("amount, status")
    .eq("userId", userId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter((row) =>
      ["success", "succeeded", "paid"].includes(String(row.status).toLowerCase()),
    )
    .reduce((sum, row) => sum + Number(row.amount), 0);
}

export async function sumSuccessfulPaymentsByUserId(
  userId: string,
): Promise<number> {
  if (hasDatabaseUrl()) {
    try {
      return await sumSuccessfulPaymentsViaPrisma(userId);
    } catch (error) {
      console.error("[PAYMENT_STORE]: Prisma ödeme toplamı hatası:", error);
    }
  }

  return sumSuccessfulPaymentsViaSupabase(userId);
}

async function sumSuccessfulPaymentsAllUsersViaPrisma(): Promise<
  Map<string, number>
> {
  const rows = await prisma.payment.findMany({
    where: {
      status: { in: ["success", "succeeded", "paid"] },
    },
    select: { userId: true, amount: true },
  });

  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.userId, (totals.get(row.userId) ?? 0) + row.amount);
  }
  return totals;
}

async function sumSuccessfulPaymentsAllUsersViaSupabase(): Promise<
  Map<string, number>
> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Payment")
    .select("userId, amount, status");

  if (error) {
    throw error;
  }

  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    if (
      !["success", "succeeded", "paid"].includes(String(row.status).toLowerCase())
    ) {
      continue;
    }
    totals.set(row.userId, (totals.get(row.userId) ?? 0) + Number(row.amount));
  }
  return totals;
}

export async function sumSuccessfulPaymentsAllUsers(): Promise<
  Map<string, number>
> {
  if (hasDatabaseUrl()) {
    try {
      return await sumSuccessfulPaymentsAllUsersViaPrisma();
    } catch (error) {
      console.error("[PAYMENT_STORE]: Prisma toplu ödeme hatası:", error);
    }
  }

  return sumSuccessfulPaymentsAllUsersViaSupabase();
}
