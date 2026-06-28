import { NextResponse, after } from "next/server";

import type { CampaignApiRequest, CampaignResponse } from "@/types/campaign";
import { assertDataAccessEnv, assertDatabaseEnv, handleApiRouteError } from "@/lib/api-error";
import { claimAutonomousCampaignSlot, getCampaignBaitCount, tryAcquireCampaignExecution } from "@/lib/campaign-store";
import { resolveCampaignBudgetParams } from "@/lib/campaign-budget";
import { processCampaignInBackground } from "@/lib/campaign-background-processor";
import { getActiveSessionUser } from "@/lib/auth-session";
import { logServerEnvStatus } from "@/lib/server-env";
import {
  finalizeExistingCampaignBilling,
} from "@/lib/campaign-billing";
import {
  debitWalletForCampaign,
  getOrCreateUserWallet,
  hasCampaignWalletDebit,
} from "@/lib/user-wallet-service";
import {
  assertTrialCampaignAllowed,
  TrialBusinessBlockedError,
} from "@/lib/registered-business-store";
import { isIyzicoConfigured } from "@/lib/iyzico-client";
import { MIN_CAMPAIGN_DAYS } from "@/lib/campaign-form-utils";
import { normalizeCampaignApiRequest } from "@/lib/campaign-api-normalize";
import {
  validateCoreQuestionSelection,
} from "@/lib/core-questions";
import { initCampaignProcessingState } from "@/lib/campaign-terminal-log-store";
import { buildStartupTerminalLogs } from "@/lib/terminal-logs";

function buildAlreadyProcessedResponse(
  campaignId: string,
  baitCount: number,
  markaAdi: string,
): CampaignResponse {
  return {
    success: true,
    campaignId,
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
              "Bu işletme adı daha önce ücretsiz deneme hakkını kullanmıştır. Devam etmek için lütfen bakiye yükleyin.",
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

    if (!selectionValidation.ok) {
      return NextResponse.json(
        {
          success: false,
          error: selectionValidation.error ?? "Geçersiz soru seçimi.",
        },
        { status: selectionValidation.statusCode ?? 400 },
      );
    }

    const userWallet = await getOrCreateUserWallet(activeUserId);
    const walletBalance = userWallet.balance;

    if (walletBalance < toplamMaliyet) {
      const amountDue = toplamMaliyet - walletBalance;

      if (isIyzicoConfigured()) {
        return NextResponse.json(
          {
            success: false,
            requiresPayment: true,
            amountDue,
            totalCost: toplamMaliyet,
            currentBalance: walletBalance,
            error: `Yetersiz bakiye. Eksik tutar: ${amountDue.toLocaleString("tr-TR")} ₺`,
            campaignDraft: {
              companyName: trimmedMarka,
              sector: trimmedSektor,
              sectorSlug,
              city: trimmedSehir,
              budget: gunlukButce,
              campaignDays: gunSayisi,
              selectedQuestionIds,
            },
          },
          { status: 402 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `SİBER BAKİYE HATASI: Bu operasyonun toplam maliyeti ${toplamMaliyet.toLocaleString("tr-TR")} ₺. Mevcut bakiyeniz (${walletBalance.toLocaleString("tr-TR")} ₺) yetersizdir!`,
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

    const executionState = await tryAcquireCampaignExecution(reservedCampaignId);

    if (executionState === "complete") {
      const debited = await hasCampaignWalletDebit(reservedCampaignId);
      if (!debited) {
        try {
          await finalizeExistingCampaignBilling({
            campaignId: reservedCampaignId,
            userId: activeUserId,
            userEmail: sessionUser?.email ?? "—",
            businessName: trimmedMarka,
            sector: sectorSlug || trimmedSektor,
            city: trimmedSehir,
            amountSpent: toplamMaliyet,
            description: `GEO Kampanya: ${trimmedMarka} (${trimmedSehir})`,
          });
        } catch (debitError) {
          if (
            debitError instanceof Error &&
            debitError.message === "INSUFFICIENT_BALANCE"
          ) {
            return NextResponse.json(
              {
                success: false,
                error: "Yetersiz bakiye. Kampanya tamamlanmış ancak ödeme alınamadı.",
              },
              { status: 402 },
            );
          }
          throw debitError;
        }
      }

      const existingBaitCount = await getCampaignBaitCount(reservedCampaignId);
      return NextResponse.json(
        buildAlreadyProcessedResponse(
          reservedCampaignId,
          existingBaitCount,
          trimmedMarka,
        ),
      );
    }

    if (executionState === "in_progress") {
      return NextResponse.json(
        buildInProgressResponse(reservedCampaignId, trimmedMarka),
      );
    }

    try {
      await debitWalletForCampaign(
        activeUserId,
        toplamMaliyet,
        reservedCampaignId,
        `GEO Kampanya: ${trimmedMarka} (${trimmedSehir})`,
      );
    } catch (debitError) {
      if (
        debitError instanceof Error &&
        debitError.message === "INSUFFICIENT_BALANCE"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Yetersiz bakiye. Kampanya başlatılamadı.",
          },
          { status: 402 },
        );
      }
      throw debitError;
    }

    const startupLogs = buildStartupTerminalLogs(trimmedMarka, trimmedSehir);
    await initCampaignProcessingState(reservedCampaignId, startupLogs);

    after(() => {
      void processCampaignInBackground({
        campaignId: reservedCampaignId,
        userId: activeUserId,
        userEmail: sessionUser?.email ?? "—",
        markaAdi: trimmedMarka,
        sektor: trimmedSektor,
        sehir: trimmedSehir,
        gunlukButce,
        gunSayisi,
        sectorSlug,
        selectedQuestionIds,
        toplamMaliyet,
        agresiflikSeviyesi,
        radarSikligi,
        radarSikligiDakika,
        businessDomain,
      });
    });

    return NextResponse.json(
      buildStartedResponse(reservedCampaignId, trimmedMarka, startupLogs),
    );
  } catch (error) {
    return handleApiRouteError(error, "İşlem sırasında bir hata oluştu.");
  }
}
