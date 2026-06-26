import { NextResponse } from "next/server";

import type { CampaignApiRequest, CampaignResponse } from "@/types/campaign";
import type { BusinessSector } from "@/types/campaign";
import { assertDataAccessEnv, assertDatabaseEnv, handleApiRouteError } from "@/lib/api-error";
import { claimAutonomousCampaignSlot, completeCampaignWithBaits, getCampaignBaitCount, tryAcquireCampaignExecution } from "@/lib/campaign-store";
import { resolveCampaignBudgetParams } from "@/lib/campaign-budget";
import { buildIntentPostTitle } from "@/lib/geo-prompt";
import { generateAiBaits, deployBaitsToNetwork } from "@/lib/bait-engine";
import { buildHubArticlePath, buildHubArticleUrl } from "@/lib/hub-url";
import { distributeBaitsToNetwork } from "@/lib/distribution-engine";
import { queryLlmInquiry } from "@/lib/llm-simulator";
import { buildDynamicTerminalLogs } from "@/lib/terminal-logs";
import { calculateDynamicMetrics } from "@/lib/mock-metrics";
import { getActiveSessionUser } from "@/lib/auth-session";
import { logServerEnvStatus } from "@/lib/server-env";
import {
  debitWalletForCampaign,
  getOrCreateUserWallet,
  hasCampaignWalletDebit,
} from "@/lib/user-wallet-service";
import {
  assertTrialCampaignAllowed,
  TrialBusinessBlockedError,
} from "@/lib/registered-business-store";
import { createCampaignGrowthLoop } from "@/lib/growth-loop-store";
import { isIyzicoConfigured } from "@/lib/iyzico-client";
import { MIN_CAMPAIGN_DAYS } from "@/lib/campaign-form-utils";
import {
  buildBaitRecordsFromSelectedQuestionsAsync,
  type SelectedQuestionPair,
} from "@/lib/selected-questions";
import { buildUniqueArticleSlug } from "@/lib/slugify";
import { applyDistributionPlatforms } from "@/lib/distribution-platform";
import { resolveMaxQuestionsFromDailyBudget } from "@/lib/intent-soft-cap";
import { normalizeCampaignApiRequest } from "@/lib/campaign-api-normalize";
import { attachCampaignIntents } from "@/lib/campaign-intent-store";
import { appendCampaignAnswersToQuestionHub, type QuestionHubEntry } from "@/lib/question-hub-store";
import { buildFixedVisibilityQuestionList } from "@/lib/fixed-visibility-simulation";
import {
  buildCoreQuestionPairs,
  getCoreQuestionPoolSize,
  validateCoreQuestionSelection,
} from "@/lib/core-questions";
import { buildForumHubUrl } from "@/lib/forum-hub-url";
import { buildQuestionHubSlug } from "@/lib/question-hub-slug";
import { recordCampaignOperationalLog } from "@/lib/campaign-log-store";
import { sumCreditPaymentsByUserId } from "@/lib/payment-store";

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

function buildInProgressResponse(
  campaignId: string,
  markaAdi: string,
): CampaignResponse {
  return {
    success: true,
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

function buildFallbackMakaleler(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `Alternatif GEO yemleme içeriği ${index + 1}`,
  );
}

async function resolveSelectedCoreQuestionPairs(
  selectedQuestionIds: string[],
  sectorSlug: BusinessSector,
  sehir: string,
  sektor: string,
  markaAdi: string,
): Promise<SelectedQuestionPair[]> {
  return buildCoreQuestionPairs(
    selectedQuestionIds,
    sectorSlug,
    sehir,
    markaAdi,
    sektor,
  );
}

export async function POST(request: Request) {
  try {
    logServerEnvStatus("campaign-post");
    assertDataAccessEnv();
    assertDatabaseEnv();
    const body = (await request.json()) as CampaignApiRequest;
    const {
      markaAdi,
      sektor,
      sehir,
      gunlukButce,
      gunSayisi,
      sectorSlug,
      selectedQuestionIds,
    } = normalizeCampaignApiRequest(body);
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

    const poolSize = getCoreQuestionPoolSize(sectorSlug);
    const maxQuestions = resolveMaxQuestionsFromDailyBudget(gunlukButce, poolSize);
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

    const makaleSayisi = selectedQuestionIds.length;

    const selectedQuestionPairs = await resolveSelectedCoreQuestionPairs(
      selectedQuestionIds,
      sectorSlug as BusinessSector,
      trimmedSehir,
      trimmedSektor,
      trimmedMarka,
    );

    const hubEntries: QuestionHubEntry[] = selectedQuestionIds.map(
      (coreQuestionId, index) => ({
        coreQuestionId,
        question: selectedQuestionPairs[index]?.question ?? "",
        simulatedAnswer: selectedQuestionPairs[index]?.simulatedAnswer ?? "",
        city: trimmedSehir,
        sectorLabel: trimmedSektor,
        sectorSlug: sectorSlug as BusinessSector,
      }),
    );

    const aiBaits = generateAiBaits(trimmedMarka, trimmedSektor, trimmedSehir);

    console.log(
      "[KEMIK SORU MOTORU]: Üretilecek soru/makale ->",
      selectedQuestionPairs.length,
      "/ seçilen",
      makaleSayisi,
      `(maxQuestions=${maxQuestions})`,
    );
    const [llmResult, baitDeployment] = await Promise.all([
      queryLlmInquiry(
        trimmedSehir,
        trimmedSektor,
        trimmedMarka,
        gunlukButce,
        gunSayisi,
      ),
      deployBaitsToNetwork(aiBaits, gunlukButce),
    ]);
    console.log("[GEO MOD]:", {
      gunlukButce,
      gunSayisi,
      makaleSayisi,
      agresiflikSeviyesi,
      radarSikligi,
      radarSikligiDakika,
    });

    const pazarAnalizSkoru = llmResult.yapayZekaGorunurlukOrani;
    const questionPairsForBaits = selectedQuestionPairs;

    let persistedBaits: Array<{
      id: string;
      baslik: string;
      icerik: string;
      slug: string;
      platform?: string;
    }> = [];

    let persistedCampaignId: string | null = reservedCampaignId;

    let distributionResults: Array<{
      baitId: string;
      slug: string;
      ok: boolean;
      externalLiveUrl?: string;
    }> = [];

    try {
      const targetCity = trimmedSehir || "Kayseri";
      const targetNiche = trimmedSektor || "Diş Kliniği & Sağlık";
      const targetBrand = trimmedMarka || "Bilinmeyen Marka";
      const currentScore =
        typeof pazarAnalizSkoru === "number" ? pazarAnalizSkoru : 38;

      console.log("[VERİTABANI ÖNCESİ]: Kaydedilecek veriler hazırlanıyor...", {
        targetCity,
        targetNiche,
        targetBrand,
        gunlukButce,
        gunSayisi,
        makaleSayisi,
        agresiflikSeviyesi,
        radarSikligi,
        radarSikligiDakika,
      });

      const usedSlugs = new Set<string>();

      const baitRecords =
        questionPairsForBaits.length > 0
          ? await buildBaitRecordsFromSelectedQuestionsAsync(
              questionPairsForBaits,
              {
                targetCity,
                targetNiche,
                targetBrand,
              },
            )
          : applyDistributionPlatforms(
              buildFallbackMakaleler(makaleSayisi).map((makale, index) => {
                const baslik = buildIntentPostTitle(
                  targetCity,
                  targetNiche,
                  index,
                );
                const slug = buildUniqueArticleSlug(baslik, index, usedSlugs);

                return {
                  baslik,
                  icerik: makale,
                  slug,
                  platform: "WORDPRESS",
                };
              }),
            );

      const yeniKampanya = await completeCampaignWithBaits(reservedCampaignId, {
        sehir: targetCity,
        sektor: targetNiche,
        markaAdi: targetBrand,
        skor: currentScore,
        gunlukButce,
        gunSayisi,
        agresiflik: agresiflikSeviyesi,
        makaleSayisi,
        radarSikligi,
        radarSikligiDakika,
        baits: baitRecords,
      });

      persistedBaits = yeniKampanya.baits.map((bait, index) => ({
        id: bait.id,
        baslik: bait.baslik,
        icerik: baitRecords[index]?.icerik ?? bait.icerik,
        slug: bait.slug,
        platform: baitRecords[index]?.platform ?? "WORDPRESS",
      }));
      persistedCampaignId = yeniKampanya.id;

      await attachCampaignIntents(
        yeniKampanya.id,
        questionPairsForBaits,
        persistedBaits,
      );

      await appendCampaignAnswersToQuestionHub({
        campaignId: yeniKampanya.id,
        brandName: targetBrand,
        entries: hubEntries,
      });

      console.log(
        `[VERİTABANI BAŞARILI]: Kampanya ID ${yeniKampanya.id} — agresiflik=${agresiflikSeviyesi}, makale=${makaleSayisi}, bait=${baitRecords.length}, radar=${radarSikligiDakika}dk`,
      );

      await debitWalletForCampaign(
        activeUserId,
        toplamMaliyet,
        yeniKampanya.id,
        `GEO Kampanya: ${targetBrand} (${targetCity})`,
      );

      const growthQuestions = buildFixedVisibilityQuestionList(trimmedSehir);
      await createCampaignGrowthLoop(
        yeniKampanya.id,
        activeUserId,
        growthQuestions,
      );
    } catch (dbError) {
      console.error(
        "[KRİTİK VERİTABANI HATASI]: Veri tabanına yazılırken bir hata oluştu:",
        dbError,
      );

      if (
        dbError instanceof Error &&
        dbError.message === "INSUFFICIENT_BALANCE"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Yetersiz bakiye. Kampanya kaydedilemedi.",
          },
          { status: 402 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Kampanya kaydedilemedi. Lütfen tekrar deneyin.",
        },
        { status: 500 },
      );
    }

    if (persistedBaits.length === 0 || !persistedCampaignId) {
      return NextResponse.json(
        {
          success: false,
          error: "Kampanya içerikleri kaydedilemedi.",
        },
        { status: 500 },
      );
    }

    if (persistedBaits.length > 0 && persistedCampaignId) {
      distributionResults = await distributeBaitsToNetwork(persistedBaits, {
        campaignId: persistedCampaignId,
        markaAdi: trimmedMarka,
        sehir: trimmedSehir,
        sektor: trimmedSektor,
        agresiflik: agresiflikSeviyesi,
      });
    }

    const campaignExternalUrl = distributionResults.find(
      (result) => result.ok && result.externalLiveUrl,
    )?.externalLiveUrl;

    const primarySlug = persistedBaits[0]?.slug;
    const hubArticles = persistedBaits.map((bait) => ({
      slug: bait.slug,
      hubPath: buildHubArticlePath(bait.slug),
    }));

    const wordpressUrl =
      distributionResults.find(
        (result) => result.ok && result.externalLiveUrl,
      )?.externalLiveUrl ?? null;

    const primaryForumSlug = hubEntries[0]?.question
      ? buildQuestionHubSlug(hubEntries[0].question)
      : null;

    void recordCampaignOperationalLog({
      campaignId: persistedCampaignId,
      userId: activeUserId,
      userEmail: sessionUser?.email ?? "—",
      businessName: trimmedMarka,
      sector: sectorSlug || trimmedSektor,
      city: trimmedSehir,
      walletBalance: Math.max(0, walletBalance - toplamMaliyet),
      amountSpent: toplamMaliyet,
      amountDeposited: await sumCreditPaymentsByUserId(activeUserId),
      wordpressUrl,
      forumUrl: primaryForumSlug ? buildForumHubUrl(primaryForumSlug) : null,
    }).catch((logError) => {
      console.error("[CAMPAIGN_LOG]: Kampanya operasyon kaydı atlandı:", logError);
    });

    const terminalLogs = buildDynamicTerminalLogs(
      {
        markaAdi,
        sektor,
        sehir,
        gunlukButce,
        gunSayisi,
        sectorSlug,
        selectedQuestionIds,
      },
      llmResult,
      baitDeployment,
    );
    const metrics = calculateDynamicMetrics(
      {
        markaAdi,
        sektor,
        sehir,
        gunlukButce,
        gunSayisi,
        sectorSlug,
        selectedQuestionIds,
      },
      llmResult,
    );

    const response: CampaignResponse = {
      success: true,
      campaignId: persistedCampaignId ?? undefined,
      metrics,
      terminalLogs,
      llmResult,
      baitsGenerated:
        persistedBaits.length > 0
          ? persistedBaits.length
          : questionPairsForBaits.length > 0
            ? questionPairsForBaits.length
            : makaleSayisi,
      message: "İçerikler başarıyla yayınlandı!",
      liveUrl: campaignExternalUrl,
      externalUrl: campaignExternalUrl ?? null,
      nexisUrl: primarySlug ? buildHubArticleUrl(primarySlug) : undefined,
      hubArticles,
      distributionResults,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiRouteError(error, "İşlem sırasında bir hata oluştu.");
  }
}
