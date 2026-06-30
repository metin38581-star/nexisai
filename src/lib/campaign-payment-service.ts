import "server-only";

import type { CampaignBackgroundJobInput } from "@/lib/campaign-background-processor";
import { dispatchCampaignBackgroundJob } from "@/lib/campaign-process-dispatch";
import {
  buildCoreQuestionPairs,
} from "@/lib/core-questions";
import {
  CAMPAIGN_STATUS,
  computeCampaignEndDate,
  type CampaignLifecycleRecord,
} from "@/lib/campaign-lifecycle";
import { getCampaignBaitCount } from "@/lib/campaign-store";
import { ensureCampaignGrowthLoop } from "@/lib/growth-loop-store";
import { initCampaignProcessingState } from "@/lib/campaign-terminal-log-store";
import { prisma } from "@/lib/db";
import { normalizeCampaignApiRequest } from "@/lib/campaign-api-normalize";
import { buildStartupTerminalLogs } from "@/lib/terminal-logs";
import { recordCampaignOperationalLog } from "@/lib/campaign-log-store";
import { buildCampaignPublicationUrls } from "@/lib/publication-urls";
import { resolveCampaignBudgetParams } from "@/lib/campaign-budget";
import { resolveAutopilotSelectedQuestionIds } from "@/services/campaign-scheduler";
import type { BusinessSector } from "@/types/campaign";

export const IYZICO_CAMPAIGN_PAYMENT_CODE = "IYZICO_CAMPAIGN_PAYMENT";
const SUCCESS_STATUSES = ["success", "succeeded", "paid"] as const;

export async function hasCampaignDirectPayment(
  campaignId: string,
): Promise<boolean> {
  const payment = await prisma.payment.findFirst({
    where: {
      campaignId,
      providerStatusCode: IYZICO_CAMPAIGN_PAYMENT_CODE,
      status: { in: [...SUCCESS_STATUSES] },
    },
    select: { id: true },
  });

  return Boolean(payment);
}

export async function userHasCampaignPayment(userId: string): Promise<boolean> {
  const payment = await prisma.payment.findFirst({
    where: {
      userId,
      providerStatusCode: IYZICO_CAMPAIGN_PAYMENT_CODE,
      status: { in: [...SUCCESS_STATUSES] },
    },
    select: { id: true },
  });

  return Boolean(payment);
}

export async function getCampaignLifecycle(
  campaignId: string,
): Promise<CampaignLifecycleRecord | null> {
  const row = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      userId: true,
      status: true,
      gunlukButce: true,
      gunSayisi: true,
      startDate: true,
      endDate: true,
      totalPaid: true,
      markaAdi: true,
      sektor: true,
      sehir: true,
    },
  });

  return row;
}

export async function markCampaignPendingPayment(
  campaignId: string,
): Promise<void> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: CAMPAIGN_STATUS.PENDING_PAYMENT },
  });
}

export async function activateCampaignAfterDirectPayment(input: {
  campaignId: string;
  userId: string;
  userEmail: string;
  amount: number;
  checkoutId: string;
  campaignDraft?: Record<string, unknown> | null;
  request?: Request;
}): Promise<{ alreadyActive: boolean; dispatched: boolean }> {
  const existingPayment = await hasCampaignDirectPayment(input.campaignId);
  const baitCount = await getCampaignBaitCount(input.campaignId);

  if (existingPayment && baitCount > 0) {
    return { alreadyActive: true, dispatched: false };
  }

  const draft =
    input.campaignDraft && typeof input.campaignDraft === "object"
      ? normalizeCampaignApiRequest(input.campaignDraft as never)
      : null;

  const lifecycle = await getCampaignLifecycle(input.campaignId);
  const startDate = new Date();
  const gunSayisi = draft?.gunSayisi ?? lifecycle?.gunSayisi ?? 7;
  const endDate = computeCampaignEndDate(startDate, gunSayisi);
  const totalPaid = input.amount;

  await prisma.$transaction(async (tx) => {
    if (!existingPayment) {
      await tx.payment.create({
        data: {
          userId: input.userId,
          amount: input.amount,
          currency: "TRY",
          status: "success",
          provider: "iyzico",
          providerStatusCode: IYZICO_CAMPAIGN_PAYMENT_CODE,
          description: `iyzico kampanya ödemesi (checkout:${input.checkoutId})`,
          campaignId: input.campaignId,
        },
      });
    }

    await tx.campaign.update({
      where: { id: input.campaignId },
      data: {
        status: CAMPAIGN_STATUS.ACTIVE,
        totalPaid,
        startDate,
        endDate,
      },
    });
  });

  if (baitCount > 0) {
    return { alreadyActive: true, dispatched: false };
  }

  const markaAdi = draft?.markaAdi ?? lifecycle?.markaAdi ?? "Kampanya";
  const sehir = draft?.sehir ?? lifecycle?.sehir ?? "";
  const sektor = draft?.sektor ?? lifecycle?.sektor ?? "";
  const gunlukButce = draft?.gunlukButce ?? lifecycle?.gunlukButce ?? 250;
  const sectorSlug = draft?.sectorSlug ?? "";
  const selectedQuestionIds = resolveAutopilotSelectedQuestionIds({
    campaignId: input.campaignId,
    brandName: markaAdi,
    city: sehir,
    sectorSlug: sectorSlug as BusinessSector,
    dailyBudget: gunlukButce,
    totalDays: gunSayisi,
    selectedQuestionIds: draft?.selectedQuestionIds ?? [],
  });
  const businessDomain = draft?.businessDomain ?? null;
  const toplamMaliyet = gunlukButce * gunSayisi;
  const budgetParams = resolveCampaignBudgetParams(gunlukButce);

  const earlyPublication = buildCampaignPublicationUrls({ businessDomain });

  void recordCampaignOperationalLog({
    campaignId: input.campaignId,
    userId: input.userId,
    userEmail: input.userEmail,
    businessName: markaAdi,
    sector: sectorSlug || sektor,
    city: sehir,
    walletBalance: 0,
    amountSpent: toplamMaliyet,
    amountDeposited: totalPaid,
    businessDomain,
    primaryAuthorityUrl: earlyPublication.primaryAuthorityUrl,
  });

  const startupLogs = buildStartupTerminalLogs(markaAdi, sehir);
  await initCampaignProcessingState(input.campaignId, startupLogs);

  if (sectorSlug && selectedQuestionIds.length > 0) {
    try {
      const growthQuestions = buildCoreQuestionPairs(
        selectedQuestionIds,
        sectorSlug,
        sehir,
        markaAdi,
        sektor,
        businessDomain,
      ).map((pair) => pair.question);

      await ensureCampaignGrowthLoop(
        input.campaignId,
        input.userId,
        growthQuestions,
      );
    } catch (error) {
      console.error("[CAMPAIGN_PAYMENT]: Growth loop oluşturulamadı:", error);
    }
  }

  const jobInput: CampaignBackgroundJobInput = {
    campaignId: input.campaignId,
    userId: input.userId,
    userEmail: input.userEmail,
    markaAdi,
    sektor,
    sehir,
    gunlukButce,
    gunSayisi,
    sectorSlug,
    selectedQuestionIds,
    toplamMaliyet,
    agresiflikSeviyesi: budgetParams.agresiflikSeviyesi,
    radarSikligi: budgetParams.radarSikligi,
    radarSikligiDakika: budgetParams.radarSikligiDakika,
    businessDomain,
  };

  dispatchCampaignBackgroundJob(jobInput, input.request);

  return { alreadyActive: false, dispatched: true };
}

export async function expireCompletedCampaigns(now = new Date()): Promise<number> {
  const result = await prisma.campaign.updateMany({
    where: {
      status: CAMPAIGN_STATUS.ACTIVE,
      endDate: { lt: now },
    },
    data: { status: CAMPAIGN_STATUS.COMPLETED },
  });

  return result.count;
}
