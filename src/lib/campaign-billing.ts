import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/db";
import { buildHubArticleUrl } from "@/lib/hub-url";
import { SECTOR_OPTIONS } from "@/lib/constants";
import { sumUserPaidTopUpsInPayments } from "@/lib/payment-store";
import type { CreateCampaignInput, CreatedCampaignResult } from "@/lib/campaign-store";

const WALLET_DEBIT_CODE = "WALLET_DEBIT";
const SUCCESS_STATUSES = new Set(["success", "succeeded", "paid"]);

function resolveSectorLabel(sektor: string): string {
  return SECTOR_OPTIONS.find((option) => option.value === sektor)?.label ?? sektor;
}

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
}

export interface CampaignBillingResult {
  balance: number;
  amountDeposited: number;
  alreadyDebited: boolean;
  campaign?: CreatedCampaignResult;
}

async function debitWalletAndWriteLogInTransaction(
  tx: Prisma.TransactionClient,
  input: CampaignBillingLogInput,
): Promise<Omit<CampaignBillingResult, "campaign">> {
  const existingDebit = await tx.payment.findFirst({
    where: {
      campaignId: input.campaignId,
      providerStatusCode: WALLET_DEBIT_CODE,
      status: { in: [...SUCCESS_STATUSES] },
    },
  });

  let alreadyDebited = false;

  await tx.wallet.upsert({
    where: { id: input.userId },
    create: { id: input.userId, balance: 0 },
    update: {},
  });

  if (!existingDebit) {
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
  } else {
    alreadyDebited = true;
  }

  const wallet = await tx.wallet.findUnique({ where: { id: input.userId } });
  const remainingBalance = wallet?.balance ?? 0;

  const payments = await tx.payment.findMany({
    where: { userId: input.userId },
    select: {
      amount: true,
      status: true,
      provider: true,
      providerStatusCode: true,
    },
  });
  const amountDeposited = sumUserPaidTopUpsInPayments(payments);

  await tx.campaignLog.upsert({
    where: { campaignId: input.campaignId },
    create: {
      campaignId: input.campaignId,
      userId: input.userId,
      userEmail: input.userEmail,
      businessName: input.businessName,
      sector: input.sector,
      sectorLabel: resolveSectorLabel(input.sector),
      city: input.city,
      walletBalance: remainingBalance,
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
      walletBalance: remainingBalance,
      amountSpent: input.amountSpent,
      amountDeposited,
      wordpressUrl: input.wordpressUrl ?? null,
      forumUrl: input.forumUrl ?? null,
    },
  });

  return { balance: remainingBalance, amountDeposited, alreadyDebited };
}

/** Kampanya kaydı + cüzdan kesintisi + CampaignLog — tek Prisma transaction. */
export async function finalizeCampaignCreationWithBilling(input: {
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

    const billing = await debitWalletAndWriteLogInTransaction(tx, {
      ...input.billing,
      campaignId: input.campaignId,
    });

    return { ...billing, campaign };
  });
}

/** Mevcut kampanya için cüzdan kesintisi + CampaignLog — tek Prisma transaction. */
export async function finalizeExistingCampaignBilling(
  input: CampaignBillingLogInput,
): Promise<CampaignBillingResult> {
  return prisma.$transaction(async (tx) => {
    return debitWalletAndWriteLogInTransaction(tx, input);
  });
}

export async function updateCampaignLogPublicationUrls(
  campaignId: string,
  urls: { wordpressUrl?: string | null; forumUrl?: string | null },
): Promise<void> {
  const data: { wordpressUrl?: string | null; forumUrl?: string | null } = {};

  if ("wordpressUrl" in urls) {
    data.wordpressUrl = urls.wordpressUrl ?? null;
  }

  if ("forumUrl" in urls) {
    data.forumUrl = urls.forumUrl ?? null;
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
    console.error("[CAMPAIGN_BILLING]: Yayın URL güncellenemedi:", {
      campaignId,
      error,
    });
  }
}
