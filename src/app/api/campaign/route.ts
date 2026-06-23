import { NextResponse } from "next/server";

import type { CampaignApiRequest, CampaignResponse } from "@/types/campaign";
import { assertDataAccessEnv, handleApiRouteError } from "@/lib/api-error";
import { claimAutonomousCampaignSlot, completeCampaignWithBaits } from "@/lib/campaign-store";
import { formatRadarSikligi } from "@/lib/campaign-budget";
import { buildIntentPostTitle } from "@/lib/geo-prompt";
import { generateAiBaits, deployBaitsToNetwork } from "@/lib/bait-engine";
import { buildHubArticlePath, buildHubArticleUrl } from "@/lib/hub-url";
import { distributeBaitsToNetwork } from "@/lib/distribution-engine";
import { queryLlmInquiry } from "@/lib/llm-simulator";
import { buildDynamicTerminalLogs } from "@/lib/terminal-logs";
import { calculateDynamicMetrics } from "@/lib/mock-metrics";
import { getActiveUserId } from "@/lib/auth-session";
import { logServerEnvStatus } from "@/lib/server-env";
import {
  decrementUserWalletBalance,
  getOrCreateUserWallet,
} from "@/lib/user-wallet-service";
import {
  isTrialBlockedForBusiness,
  registerBusinessForTrial,
} from "@/lib/registered-business-store";
import { createCampaignGrowthLoop } from "@/lib/growth-loop-store";
import { isIyzicoConfigured } from "@/lib/iyzico-client";
import { MIN_CAMPAIGN_DAYS } from "@/lib/campaign-form-utils";
import {
  buildBaitRecordsFromSelectedQuestionsAsync,
  type SelectedQuestionPair,
} from "@/lib/selected-questions";
import { generateMicroIntents } from "@/lib/geo-engine";
import { buildUniqueArticleSlug } from "@/lib/slugify";
import { applyDistributionPlatforms } from "@/lib/distribution-platform";
import { resolveMaxQuestionsFromDailyBudget } from "@/lib/intent-soft-cap";
import { normalizeCampaignApiRequest } from "@/lib/campaign-api-normalize";
import { attachCampaignIntents } from "@/lib/campaign-intent-store";
import { recordPayment } from "@/lib/payment-store";

function buildFallbackMakaleler(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `Alternatif GEO yemleme içeriği ${index + 1}`,
  );
}

async function resolveAutonomousQuestionPairs(
  sehir: string,
  sektor: string,
  markaAdi: string,
  maxQuestions: number,
): Promise<SelectedQuestionPair[]> {
  const intents = await generateMicroIntents(
    sehir,
    sektor,
    markaAdi,
    maxQuestions,
  );

  return intents.slice(0, maxQuestions).map((intent) => ({
    question: intent.question,
    simulatedAnswer: intent.simulatedAnswer,
  }));
}

export async function POST(request: Request) {
  try {
    logServerEnvStatus("campaign-post");
    assertDataAccessEnv();
    const body = (await request.json()) as CampaignApiRequest;
    const {
      markaAdi,
      sektor,
      sehir,
      gunlukButce,
      gunSayisi,
    } = normalizeCampaignApiRequest(body);
    const toplamMaliyet = gunlukButce * gunSayisi;

    let makaleSayisi = 2;
    let agresiflikSeviyesi = "Düşük";
    let radarSikligiDakika = 1440;

    if (gunlukButce > 100) {
      makaleSayisi = 15;
      agresiflikSeviyesi = "Kritik Domination";
      radarSikligiDakika = 15;
    } else if (gunlukButce > 50) {
      makaleSayisi = 8;
      agresiflikSeviyesi = "Yüksek";
      radarSikligiDakika = 60;
    } else if (gunlukButce > 15) {
      makaleSayisi = 4;
      agresiflikSeviyesi = "Orta";
      radarSikligiDakika = 360;
    }

    const radarSikligi = formatRadarSikligi(radarSikligiDakika);

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

    const activeUserId = await getActiveUserId(request);
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

    const trialBlocked = await isTrialBlockedForBusiness(
      trimmedMarka,
      activeUserId,
    );

    if (trialBlocked) {
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
              city: trimmedSehir,
              budget: gunlukButce,
              campaignDays: gunSayisi,
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

    const reservedCampaignId = await claimAutonomousCampaignSlot({
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

    if (!reservedCampaignId) {
      console.warn(
        "[OTONOM GEO]: Yinelenen istek reddedildi —",
        trimmedMarka,
        trimmedSehir,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate request",
        },
        { status: 429 },
      );
    }

    const maxQuestions = resolveMaxQuestionsFromDailyBudget(gunlukButce);
    makaleSayisi = maxQuestions;

    const aiBaits = generateAiBaits(trimmedMarka, trimmedSektor, trimmedSehir);

    const autonomousQuestionPairs = await resolveAutonomousQuestionPairs(
      trimmedSehir,
      trimmedSektor,
      trimmedMarka,
      maxQuestions,
    );

    console.log(
      "[OTONOM GEO MOTORU]: Üretilecek soru/makale ->",
      autonomousQuestionPairs.length,
      "/ hedef",
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
    const questionPairsForBaits = autonomousQuestionPairs;

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

      console.log(
        `[VERİTABANI BAŞARILI]: Kampanya ID ${yeniKampanya.id} — agresiflik=${agresiflikSeviyesi}, makale=${makaleSayisi}, bait=${baitRecords.length}, radar=${radarSikligiDakika}dk`,
      );

      await decrementUserWalletBalance(activeUserId, toplamMaliyet);

      if (!userWallet.hasPaidTopUp) {
        await registerBusinessForTrial(trimmedMarka, activeUserId);
      }

      await recordPayment({
        userId: activeUserId,
        amount: toplamMaliyet,
        currency: "TRY",
        status: "success",
        provider: "internal",
        providerStatusCode: "WALLET_DEBIT",
        description: `GEO Kampanya: ${targetBrand} (${targetCity})`,
        campaignId: yeniKampanya.id,
      });

      const growthQuestions = questionPairsForBaits.map((pair) => pair.question);
      if (growthQuestions.length > 0) {
        await createCampaignGrowthLoop(
          yeniKampanya.id,
          activeUserId,
          growthQuestions,
        );
      }
    } catch (dbError) {
      console.error(
        "[KRİTİK VERİTABANI HATASI]: Veri tabanına yazılırken bir hata oluştu:",
        dbError,
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

    const terminalLogs = buildDynamicTerminalLogs(
      { markaAdi, sektor, sehir, gunlukButce, gunSayisi },
      llmResult,
      baitDeployment,
    );
    const metrics = calculateDynamicMetrics(
      { markaAdi, sektor, sehir, gunlukButce, gunSayisi },
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
