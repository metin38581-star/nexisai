import "server-only";

import { prisma } from "@/lib/db";
import { SECTOR_OPTIONS } from "@/lib/constants";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";
import { sumSuccessfulPaymentsByUserId } from "@/lib/payment-store";
import type { AdminCampaignOverviewRow } from "@/types/admin";

function resolveSectorLabel(sektor: string): string {
  return SECTOR_OPTIONS.find((option) => option.value === sektor)?.label ?? sektor;
}

export interface RecordCampaignLogInput {
  campaignId: string;
  userId: string;
  userEmail: string;
  businessName: string;
  sector: string;
  city: string;
  walletBalance: number;
  amountSpent: number;
  amountDeposited?: number;
  wordpressUrl?: string | null;
  forumUrl?: string | null;
}

async function recordCampaignLogViaPrisma(
  input: RecordCampaignLogInput,
): Promise<void> {
  const amountDeposited =
    input.amountDeposited ??
    (await sumSuccessfulPaymentsByUserId(input.userId));

  await prisma.campaignLog.upsert({
    where: { campaignId: input.campaignId },
    create: {
      campaignId: input.campaignId,
      userId: input.userId,
      userEmail: input.userEmail,
      businessName: input.businessName,
      sector: input.sector,
      sectorLabel: resolveSectorLabel(input.sector),
      city: input.city,
      walletBalance: input.walletBalance,
      amountSpent: input.amountSpent,
      amountDeposited,
      wordpressUrl: input.wordpressUrl ?? null,
      forumUrl: input.forumUrl ?? null,
    },
    update: {
      userEmail: input.userEmail,
      businessName: input.businessName,
      sector: input.sector,
      sectorLabel: resolveSectorLabel(input.sector),
      city: input.city,
      walletBalance: input.walletBalance,
      amountSpent: input.amountSpent,
      amountDeposited,
      wordpressUrl: input.wordpressUrl ?? null,
      forumUrl: input.forumUrl ?? null,
    },
  });
}

async function recordCampaignLogViaSupabase(
  input: RecordCampaignLogInput,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const amountDeposited =
    input.amountDeposited ??
    (await sumSuccessfulPaymentsByUserId(input.userId));

  const row = {
    id: crypto.randomUUID(),
    campaign_id: input.campaignId,
    user_id: input.userId,
    user_email: input.userEmail,
    business_name: input.businessName,
    sector: input.sector,
    sector_label: resolveSectorLabel(input.sector),
    city: input.city,
    wallet_balance: input.walletBalance,
    amount_spent: input.amountSpent,
    amount_deposited: amountDeposited,
    wordpress_url: input.wordpressUrl ?? null,
    forum_url: input.forumUrl ?? null,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("CampaignLog").upsert(row, {
    onConflict: "campaign_id",
  });

  if (error) {
    throw error;
  }
}

export async function recordCampaignOperationalLog(
  input: RecordCampaignLogInput,
): Promise<void> {
  try {
    if (hasDatabaseUrl()) {
      await recordCampaignLogViaPrisma(input);
      return;
    }

    await recordCampaignLogViaSupabase(input);
  } catch (error) {
    console.error("[CAMPAIGN_LOG]: Operasyonel kayıt başarısız:", {
      campaignId: input.campaignId,
      error,
    });
  }
}

async function listCampaignLogsViaPrisma(): Promise<AdminCampaignOverviewRow[]> {
  const logs = await prisma.campaignLog.findMany({
    orderBy: { createdAt: "desc" },
  });

  return logs.map((log) => ({
    campaignId: log.campaignId,
    userEmail: log.userEmail,
    businessName: log.businessName,
    sector: log.sector,
    sectorLabel: log.sectorLabel ?? resolveSectorLabel(log.sector),
    city: log.city,
    walletBalance: log.walletBalance,
    totalDeposited: log.amountDeposited,
    amountSpent: log.amountSpent,
    wordpressUrl: log.wordpressUrl,
    forumUrl: log.forumUrl,
    createdAt: log.createdAt.toISOString(),
  }));
}

async function listCampaignLogsViaSupabase(): Promise<AdminCampaignOverviewRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("CampaignLog")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((log) => ({
    campaignId: log.campaign_id as string,
    userEmail: log.user_email as string,
    businessName: log.business_name as string,
    sector: log.sector as string,
    sectorLabel:
      (log.sector_label as string | null) ??
      resolveSectorLabel(log.sector as string),
    city: log.city as string,
    walletBalance: Number(log.wallet_balance),
    totalDeposited: Number(log.amount_deposited),
    amountSpent: Number(log.amount_spent),
    wordpressUrl: (log.wordpress_url as string | null) ?? null,
    forumUrl: (log.forum_url as string | null) ?? null,
    createdAt: log.created_at as string,
  }));
}

export async function listCampaignOperationalLogs(): Promise<
  AdminCampaignOverviewRow[]
> {
  if (hasDatabaseUrl()) {
    try {
      return await listCampaignLogsViaPrisma();
    } catch (error) {
      console.error("[CAMPAIGN_LOG]: Prisma log listesi hatası:", error);
    }
  }

  try {
    return await listCampaignLogsViaSupabase();
  } catch (error) {
    console.error("[CAMPAIGN_LOG]: Supabase log listesi hatası:", error);
    return [];
  }
}
