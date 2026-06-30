import { NextResponse } from "next/server";

import type { CampaignApiRequest, CampaignResponse } from "@/types/campaign";
import { assertDataAccessEnv, assertDatabaseEnv, handleApiRouteError } from "@/lib/api-error";
import { claimAutonomousCampaignSlot, getCampaignBaitCount, tryAcquireCampaignExecution } from "@/lib/campaign-store";
import { resolveCampaignBudgetParams } from "@/lib/campaign-budget";
import { dispatchCampaignBackgroundJob } from "@/lib/campaign-process-dispatch";
import { getActiveSessionUser } from "@/lib/auth-session";
import { logServerEnvStatus } from "@/lib/server-env";
import {
  assertTrialCampaignAllowed,
  TrialBusinessBlockedError,
} from "@/lib/registered-business-store";
import {
  buildPaymentCallbackUrl,
  initializeIyzicoCheckout,
  isIyzicoConfigured,
} from "@/lib/iyzico-client";
import { MIN_CAMPAIGN_DAYS, MAX_CAMPAIGN_DAYS } from "@/lib/campaign-form-utils";
import { normalizeCampaignApiRequest } from "@/lib/campaign-api-normalize";
import {
  validateCoreQuestionSelection,
  buildCoreQuestionPairs,
  isCoreQuestionSectorSupported,
} from "@/lib/core-questions";
import {
  resolveAutopilotSelectedQuestionIds,
} from "@/services/campaign-scheduler";
import { ensureCampaignGrowthLoop } from "@/lib/growth-loop-store";
import { recordCampaignOperationalLog } from "@/lib/campaign-log-store";
import { initCampaignProcessingState } from "@/lib/campaign-terminal-log-store";
import { buildStartupTerminalLogs } from "@/lib/terminal-logs";
import { buildCampaignPublicationUrls } from "@/lib/publication-urls";
import type { BusinessSector } from "@/types/campaign";
import {
  markCampaignPendingPayment,
  hasCampaignDirectPayment,
} from "@/lib/campaign-payment-service";

export const maxDuration = 300;

function buildAlreadyProcessedResponse(
  campaignId: string,
  baitCount: number,
  markaAdi: string,
): CampaignResponse {
  return {
    success: true,
    campaignId,
    status: baitCount > 0 ? "complete" : "processing",
    inProgress: baitCount === 0,
    baitsGenerated: baitCount,
    terminalLogs: [
      {
        id: `resume-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        category: "SİSTEM",
        message: `✓ [OTURUM]: ${markaAdi} kampanyası zaten aktif — mevcut operasyona bağlandınız.`,
      },
    ],
    message: "Kampanya zaten başlatılmış.",
    metrics: {
      visibilityRate: 0,
      estimatedTraffic: 0,
      spentBudget: 0,
      totalBudget: 0,
    },
  };
}

function buildStartedResponse(
  campaignId: string,
  markaAdi: string,
  terminalLogs: CampaignResponse["terminalLogs"],
): CampaignResponse {
  return {
    success: true,
    status: "started",
    campaignId,
    inProgress: true,
    baitsGenerated: 0,
    terminalLogs,
    message: "Kampanya arka planda başlatıldı.",
    metrics: {
      visibilityRate: 0,
      estimatedTraffic: 0,
      spentBudget: 0,
      totalBudget: 0,
    },
  };
}

function buildInProgressResponse(
  campaignId: string,
  markaAdi: string,
): CampaignResponse {
  return {
    success: true,
    status: "processing",
    campaignId,
    inProgress: true,
    baitsGenerated: 0,
    terminalLogs: [
      {
        id: `progress-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        category: "SİSTEM",
        message: `✓ [OTURUM]: ${markaAdi} kampanyası işleniyor — operasyon devam ediyor.`,
      },
    ],
    message: "Kampanya işleniyor.",
    metrics: {
      visibilityRate: 0,
      estimatedTraffic: 0,
      spentBudget: 0,
      totalBudget: 0,
    },
  };
}

function buildCampaignDraft(
  normalized: ReturnType<typeof normalizeCampaignApiRequest>,
  campaignId: string,
  buyerEmail: string,
): Record<string, unknown> {
  return {
    companyName: normalized.markaAdi,
    sector: normalized.sektor,
    sectorSlug: normalized.sectorSlug,
    city: normalized.sehir,
    budget: normalized.gunlukButce,
    campaignDays: normalized.gunSayisi,
    selectedQuestionIds: normalized.selectedQuestionIds,
    businessDomain: normalized.businessDomain,
    campaignId,
    buyerEmail,
  };
}

async function launchPaidCampaign(input: {
  campaignId: string;
  userId: string;
  userEmail: string;
  markaAdi: string;
  sektor: string;
  sehir: string;
  gunlukButce: number;
  gunSayisi: number;
  sectorSlug: string;
  selectedQuestionIds: string[];
  toplamMaliyet: number;
  agresiflikSeviyesi: string;
  radarSikligi: string;
  radarSikligiDakika: number;
  businessDomain?: string | null;
  request: Request;
}): Promise<CampaignResponse> {
  const executionState = await tryAcquireCampaignExecution(input.campaignId);

  if (executionState === "complete") {
    const existingBaitCount = await getCampaignBaitCount(input.campaignId);
    return buildAlreadyProcessedResponse(
      input.campaignId,
      existingBaitCount,
      input.markaAdi,
    );
  }

  if (executionState === "in_progress") {
    return buildInProgressResponse(input.campaignId, input.markaAdi);
  }

  const earlyPublication = buildCampaignPublicationUrls({
    businessDomain: input.businessDomain,
  });

  void recordCampaignOperationalLog({
    campaignId: input.campaignId,
    userId: input.userId,
    userEmail: input.userEmail,
    businessName: input.markaAdi,
    sector: input.sectorSlug || input.sektor,
    city: input.sehir,
    walletBalance: 0,
    amountSpent: input.toplamMaliyet,
    amountDeposited: input.toplamMaliyet,
    businessDomain: input.businessDomain ?? null,
    primaryAuthorityUrl: earlyPublication.primaryAuthorityUrl,
  });

  const startupLogs = buildStartupTerminalLogs(input.markaAdi, input.sehir);
  await initCampaignProcessingState(input.campaignId, startupLogs);

  if (input.sectorSlug && input.selectedQuestionIds.length > 0) {
    try {
      const growthQuestions = buildCoreQuestionPairs(
        input.selectedQuestionIds,
        input.sectorSlug as BusinessSector,
        input.sehir,
        input.markaAdi,
        input.sektor,
        input.businessDomain,
      ).map((pair) => pair.question);

      await ensureCampaignGrowthLoop(
        input.campaignId,
        input.userId,
        growthQuestions,
      );
    } catch (growthLoopError) {
      console.error(
        "[CAMPAIGN_POST]: Growth loop erken oluşturma başarısız:",
        growthLoopError,
      );
    }
  }

  dispatchCampaignBackgroundJob(
    {
      campaignId: input.campaignId,
      userId: input.userId,
      userEmail: input.userEmail,
      markaAdi: input.markaAdi,
      sektor: input.sektor,
      sehir: input.sehir,
      gunlukButce: input.gunlukButce,
      gunSayisi: input.gunSayisi,
      sectorSlug: input.sectorSlug,
      selectedQuestionIds: input.selectedQuestionIds,
      toplamMaliyet: input.toplamMaliyet,
      agresiflikSeviyesi: input.agresiflikSeviyesi,
      radarSikligi: input.radarSikligi,
      radarSikligiDakika: input.radarSikligiDakika,
      businessDomain: input.businessDomain,
    },
    input.request,
  );

  return buildStartedResponse(input.campaignId, input.markaAdi, startupLogs);
}

export async function POST(request: Request) {
  try {
    logServerEnvStatus("campaign-post");
    assertDataAccessEnv();
    assertDatabaseEnv();
    const body = (await request.json()) as CampaignApiRequest;
    const normalized = normalizeCampaignApiRequest(body);
    const {
      markaAdi,
      sektor,
      sehir,
      gunlukButce,
      gunSayisi,
      sectorSlug,
      selectedQuestionIds,
      businessDomain,
    } = normalized;
    const toplamMaliyet = gunlukButce * gunSayisi;

    const budgetParams = resolveCampaignBudgetParams(gunlukButce);
    const agresiflikSeviyesi = budgetParams.agresiflikSeviyesi;
    const radarSikligiDakika = budgetParams.radarSikligiDakika;
    const radarSikligi = budgetParams.radarSikligi;

    if (!markaAdi || !sehir) {
      return NextResponse.json(
        { success: false, error: "İşletme adı ve şehir zorunludur." },
        { status: 400 },
      );
    }

    if (!sektor) {
      return NextResponse.json(
        { success: false, error: "Sektör bilgisi zorunludur." },
        { status: 400 },
      );
    }

    if (gunlukButce < 100) {
      return NextResponse.json(
        { success: false, error: "Günlük bütçe en az 100 TL olmalıdır." },
        { status: 400 },
      );
    }

    if (gunSayisi < MIN_CAMPAIGN_DAYS) {
      return NextResponse.json(
        {
          success: false,
          error: `Kampanya süresi en az ${MIN_CAMPAIGN_DAYS} gün olmalıdır.`,
        },
        { status: 400 },
      );
    }

    if (gunSayisi > MAX_CAMPAIGN_DAYS) {
      return NextResponse.json(
        {
          success: false,
          error: `Kampanya süresi en fazla ${MAX_CAMPAIGN_DAYS} gün olabilir.`,
        },
        { status: 400 },
      );
    }

    const sessionUser = await getActiveSessionUser(request);
    const activeUserId = sessionUser?.id ?? null;
    if (!activeUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Kampanya oluşturmak için oturum açmanız gerekiyor.",
        },
        { status: 401 },
      );
    }

    const trimmedMarka = markaAdi;
    const trimmedSektor = sektor;
    const trimmedSehir = sehir;

    try {
      await assertTrialCampaignAllowed(trimmedMarka, activeUserId);
    } catch (error) {
      if (error instanceof TrialBusinessBlockedError) {
        return NextResponse.json(
          {
            success: false,
            error: "TRIAL_BUSINESS_BLOCKED",
            message:
              "Bu işletme adı daha önce deneme hakkını kullanmıştır. Devam etmek için yeni bir kampanya satın alın.",
          },
          { status: 403 },
        );
      }
      throw error;
    }

    const selectionValidation = validateCoreQuestionSelection({
      budget: gunlukButce,
      sectorSlug,
      selectedIds: selectedQuestionIds,
    });

    if (
      selectedQuestionIds.length > 0 &&
      !selectionValidation.ok
    ) {
      return NextResponse.json(
        {
          success: false,
          error: selectionValidation.error ?? "Geçersiz soru seçimi.",
        },
        { status: selectionValidation.statusCode ?? 400 },
      );
    }

    if (
      selectedQuestionIds.length === 0 &&
      !isCoreQuestionSectorSupported(sectorSlug)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Seçilen sektör için otopilot optimizasyon henüz aktif değil.",
        },
        { status: 400 },
      );
    }

    let reservedCampaignId: string;
    try {
      reservedCampaignId = await claimAutonomousCampaignSlot({
        userId: activeUserId,
        sehir: trimmedSehir,
        sektor: trimmedSektor,
        markaAdi: trimmedMarka,
        gunlukButce,
        gunSayisi,
        agresiflik: agresiflikSeviyesi,
        radarSikligi,
        radarSikligiDakika,
      });
    } catch (slotError) {
      console.error("[OTONOM GEO]: Kampanya slotu alınamadı:", slotError);
      return NextResponse.json(
        {
          success: false,
          error:
            "Kampanya başlatılamadı. Lütfen birkaç saniye bekleyip tekrar deneyin.",
        },
        { status: 500 },
      );
    }

    const resolvedQuestionIds = resolveAutopilotSelectedQuestionIds({
      campaignId: reservedCampaignId,
      brandName: trimmedMarka,
      city: trimmedSehir,
      sectorSlug: sectorSlug as BusinessSector,
      dailyBudget: gunlukButce,
      totalDays: gunSayisi,
      selectedQuestionIds,
    });

    if (resolvedQuestionIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Otopilot soru havuzu bu bütçe ve süre için yeterli içerik üretemedi.",
        },
        { status: 400 },
      );
    }

    const campaignPaid = await hasCampaignDirectPayment(reservedCampaignId);

    if (campaignPaid) {
      const started = await launchPaidCampaign({
        campaignId: reservedCampaignId,
        userId: activeUserId,
        userEmail: sessionUser?.email ?? "—",
        markaAdi: trimmedMarka,
        sektor: trimmedSektor,
        sehir: trimmedSehir,
        gunlukButce,
        gunSayisi,
        sectorSlug,
        selectedQuestionIds: resolvedQuestionIds,
        toplamMaliyet,
        agresiflikSeviyesi,
        radarSikligi,
        radarSikligiDakika,
        businessDomain,
        request,
      });

      return NextResponse.json(started);
    }

    if (!isIyzicoConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ödeme sistemi yapılandırılmamış. Kampanya başlatılamıyor.",
        },
        { status: 503 },
      );
    }

    await markCampaignPendingPayment(reservedCampaignId);

    const campaignDraft = buildCampaignDraft(
      {
        ...normalized,
        selectedQuestionIds: resolvedQuestionIds,
      },
      reservedCampaignId,
      sessionUser?.email ?? "user@nexisai.com",
    );

    const checkout = await initializeIyzicoCheckout({
      userId: activeUserId,
      amount: toplamMaliyet,
      buyerEmail: sessionUser?.email ?? "user@nexisai.com",
      buyerName: trimmedMarka,
      campaignId: reservedCampaignId,
      campaignDraft,
      callbackUrl: buildPaymentCallbackUrl(),
    });

    return NextResponse.json(
      {
        success: false,
        requiresPayment: true,
        totalCost: toplamMaliyet,
        campaignId: reservedCampaignId,
        paymentPageUrl: checkout.paymentPageUrl,
        campaignDraft,
        error: `Kampanya paketi: ${toplamMaliyet.toLocaleString("tr-TR")} ₺ — ödeme gerekli.`,
      },
      { status: 402 },
    );
  } catch (error) {
    return handleApiRouteError(error, "İşlem sırasında bir hata oluştu.");
  }
}
