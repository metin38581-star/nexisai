import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";
import { buildHubArticleUrl } from "@/lib/hub-url";
import {
  completeCampaignWithBaits,
  type CreateCampaignInput,
  type CreatedCampaignResult,
} from "@/lib/campaign-store";
import { recordCampaignOperationalLog } from "@/lib/campaign-log-store";
import { resolvePrimaryAuthority } from "@/lib/business-domain";
import { sumUserPaidTopUpsByUserId } from "@/lib/payment-store";
import { debitWalletForCampaign } from "@/lib/user-wallet-service";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasSupabaseAdminEnv } from "@/lib/server-env";

const WALLET_DEBIT_CODE = "WALLET_DEBIT";
const SUCCESS_STATUSES = ["success", "succeeded", "paid"] as const;

function buildPublishedBaitFields(slug: string) {
  const hubUrl = buildHubArticleUrl(slug);
  return {
    yayinlandi: true,
    status: "PUBLISHED",
    liveUrl: hubUrl,
  };
}

async function completeCampaignWithBaitsInTransaction(
  tx: Prisma.TransactionClient,
  campaignId: string,
  input: Omit<CreateCampaignInput, "userId">,
): Promise<CreatedCampaignResult> {
  const existing = await tx.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  await tx.campaign.update({
    where: { id: campaignId },
    data: {
      sehir: input.sehir,
      sektor: input.sektor,
      markaAdi: input.markaAdi,
      skor: input.skor,
      gunlukButce: input.gunlukButce,
      gunSayisi: input.gunSayisi,
      agresiflik: input.agresiflik,
      makaleSayisi: input.makaleSayisi,
      radarSikligi: input.radarSikligi,
      radarSikligiDakika: input.radarSikligiDakika,
      businessDomain: input.businessDomain ?? null,
      baits: {
        create: input.baits.map((bait) => ({
          ...bait,
          ...buildPublishedBaitFields(bait.slug),
        })),
      },
    },
  });

  const baits = await tx.bait.findMany({
    where: { campaignId },
    select: { id: true, baslik: true, icerik: true, slug: true },
  });

  return { id: campaignId, baits };
}

async function debitWalletInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    campaignId: string;
    amountSpent: number;
    description: string;
  },
): Promise<{ balance: number; alreadyDebited: boolean }> {
  const existingDebit = await tx.payment.findFirst({
    where: {
      campaignId: input.campaignId,
      providerStatusCode: WALLET_DEBIT_CODE,
      status: { in: [...SUCCESS_STATUSES] },
    },
  });

  if (existingDebit) {
    const wallet = await tx.wallet.findUnique({ where: { id: input.userId } });
    return { balance: wallet?.balance ?? 0, alreadyDebited: true };
  }

  const wallet = await tx.wallet.findUnique({ where: { id: input.userId } });
  if (!wallet) {
    throw new Error("WALLET_NOT_FOUND");
  }

  const updated = await tx.wallet.updateMany({
    where: {
      id: input.userId,
      balance: { gte: input.amountSpent },
    },
    data: { balance: { decrement: input.amountSpent } },
  });

  if (updated.count === 0) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  await tx.payment.create({
    data: {
      userId: input.userId,
      amount: input.amountSpent,
      currency: "TRY",
      status: "success",
      provider: "internal",
      providerStatusCode: WALLET_DEBIT_CODE,
      description: input.description,
      campaignId: input.campaignId,
    },
  });

  const refreshed = await tx.wallet.findUniqueOrThrow({
    where: { id: input.userId },
  });

  return { balance: refreshed.balance, alreadyDebited: false };
}

export interface CampaignBillingLogInput {
  campaignId: string;
  userId: string;
  userEmail: string;
  businessName: string;
  sector: string;
  city: string;
  amountSpent: number;
  description: string;
  wordpressUrl?: string | null;
  forumUrl?: string | null;
  blogUrl?: string | null;
  businessDomain?: string | null;
  primaryAuthorityUrl?: string | null;
}

export interface CampaignBillingResult {
  balance: number;
  amountDeposited: number;
  alreadyDebited: boolean;
  campaign?: CreatedCampaignResult;
}

async function writeCampaignBillingLog(
  billing: CampaignBillingLogInput,
  balance: number,
  amountDeposited: number,
): Promise<void> {
  await recordCampaignOperationalLog({
    campaignId: billing.campaignId,
    userId: billing.userId,
    userEmail: billing.userEmail,
    businessName: billing.businessName,
    sector: billing.sector,
    city: billing.city,
    walletBalance: balance,
    amountSpent: billing.amountSpent,
    amountDeposited,
    wordpressUrl: billing.wordpressUrl ?? null,
    forumUrl: billing.forumUrl ?? null,
    blogUrl: billing.blogUrl ?? null,
    businessDomain: billing.businessDomain ?? null,
    primaryAuthorityUrl:
      billing.primaryAuthorityUrl ??
      resolvePrimaryAuthority(billing.businessDomain).primaryAuthorityUrl,
  });
}

async function runTransactionalCampaignBilling(input: {
  campaignId: string;
  campaign: Omit<CreateCampaignInput, "userId">;
  billing: CampaignBillingLogInput;
}): Promise<CampaignBillingResult> {
  return prisma.$transaction(async (tx) => {
    const campaign = await completeCampaignWithBaitsInTransaction(
      tx,
      input.campaignId,
      input.campaign,
    );

    const walletResult = await debitWalletInTransaction(tx, {
      userId: input.billing.userId,
      campaignId: input.campaignId,
      amountSpent: input.billing.amountSpent,
      description: input.billing.description,
    });

    return {
      campaign,
      balance: walletResult.balance,
      alreadyDebited: walletResult.alreadyDebited,
      amountDeposited: 0,
    };
  });
}

async function runFallbackCampaignBilling(input: {
  campaignId: string;
  campaign: Omit<CreateCampaignInput, "userId">;
  billing: CampaignBillingLogInput;
}): Promise<CampaignBillingResult> {
  const campaign = await completeCampaignWithBaits(
    input.campaignId,
    input.campaign,
  );

  const walletResult = await debitWalletForCampaign(
    input.billing.userId,
    input.billing.amountSpent,
    input.campaignId,
    input.billing.description,
  );

  const amountDeposited = await sumUserPaidTopUpsByUserId(input.billing.userId);

  return {
    campaign,
    balance: walletResult.balance,
    alreadyDebited: walletResult.alreadyDebited,
    amountDeposited,
  };
}

/** Kampanya + cüzdan kesintisi atomik; log yazımı kampanyayı bloklamaz. */
export async function finalizeCampaignCreationWithBilling(input: {
  campaignId: string;
  campaign: Omit<CreateCampaignInput, "userId">;
  billing: CampaignBillingLogInput;
}): Promise<CampaignBillingResult> {
  let result: CampaignBillingResult;

  try {
    result = await runTransactionalCampaignBilling(input);
    result.amountDeposited = await sumUserPaidTopUpsByUserId(
      input.billing.userId,
    );
  } catch (transactionError) {
    console.error(
      "[CAMPAIGN_BILLING]: Transaction başarısız, sıralı fallback deneniyor:",
      transactionError,
    );
    result = await runFallbackCampaignBilling(input);
  }

  await writeCampaignBillingLog(
    input.billing,
    result.balance,
    result.amountDeposited,
  );

  return result;
}

/** Mevcut kampanya için cüzdan kesintisi + log. */
export async function finalizeExistingCampaignBilling(
  input: CampaignBillingLogInput,
): Promise<CampaignBillingResult> {
  const walletResult = await debitWalletForCampaign(
    input.userId,
    input.amountSpent,
    input.campaignId,
    input.description,
  );

  const amountDeposited = await sumUserPaidTopUpsByUserId(input.userId);

  await writeCampaignBillingLog(
    input,
    walletResult.balance,
    amountDeposited,
  );

  return {
    balance: walletResult.balance,
    amountDeposited,
    alreadyDebited: walletResult.alreadyDebited,
  };
}

export async function updateCampaignLogPublicationUrls(
  campaignId: string,
  urls: {
    wordpressUrl?: string | null;
    forumUrl?: string | null;
    blogUrl?: string | null;
    primaryAuthorityUrl?: string | null;
  },
): Promise<void> {
  const data: {
    wordpressUrl?: string | null;
    forumUrl?: string | null;
    blogUrl?: string | null;
    primaryAuthorityUrl?: string | null;
  } = {};

  if ("wordpressUrl" in urls) {
    data.wordpressUrl = urls.wordpressUrl ?? null;
  }

  if ("forumUrl" in urls) {
    data.forumUrl = urls.forumUrl ?? null;
  }

  if ("blogUrl" in urls) {
    data.blogUrl = urls.blogUrl ?? null;
  }

  if ("primaryAuthorityUrl" in urls) {
    data.primaryAuthorityUrl = urls.primaryAuthorityUrl ?? null;
  }

  if (Object.keys(data).length === 0) {
    return;
  }

  try {
    await prisma.campaignLog.update({
      where: { campaignId },
      data,
    });
  } catch (error) {
    console.error("[CAMPAIGN_BILLING]: Prisma yayın URL güncellenemedi:", {
      campaignId,
      error,
    });
  }

  if (!hasSupabaseAdminEnv()) {
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const patch: Record<string, string | null> = {};

    if ("wordpressUrl" in urls) {
      patch.wordpress_url = urls.wordpressUrl ?? null;
    }
    if ("forumUrl" in urls) {
      patch.forum_url = urls.forumUrl ?? null;
    }
    if ("blogUrl" in urls) {
      patch.blog_url = urls.blogUrl ?? null;
    }
    if ("primaryAuthorityUrl" in urls) {
      patch.primary_authority_url = urls.primaryAuthorityUrl ?? null;
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    const { error } = await supabase
      .from("CampaignLog")
      .update(patch)
      .eq("campaign_id", campaignId);

    if (error) {
      console.error("[CAMPAIGN_BILLING]: Supabase yayın URL güncellenemedi:", error);
    }
  } catch (error) {
    console.error("[CAMPAIGN_BILLING]: Supabase yayın URL fallback hatası:", error);
  }
}
