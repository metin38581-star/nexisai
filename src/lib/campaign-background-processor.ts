import "server-only";

import type { BusinessSector, CampaignResponse } from "@/types/campaign";
import { generateAiBaits, deployBaitsToNetwork } from "@/lib/bait-engine";
import { buildHubArticlePath, buildHubArticleUrl } from "@/lib/hub-url";
import { distributeBaitsToNetwork } from "@/lib/distribution-engine";
import { queryLlmInquiry } from "@/lib/llm-simulator";
import {
  buildDynamicTerminalLogs,
  buildProgressTerminalLog,
} from "@/lib/terminal-logs";
import { calculateDynamicMetrics } from "@/lib/mock-metrics";
import {
  finalizeCampaignCreationWithBilling,
  updateCampaignLogPublicationUrls,
} from "@/lib/campaign-billing";
import { releaseCampaignProcessingLock } from "@/lib/campaign-store";
import { createCampaignGrowthLoop } from "@/lib/growth-loop-store";
import {
  buildBaitRecordsFromSelectedQuestionsAsync,
  type SelectedQuestionPair,
} from "@/lib/selected-questions";
import { buildUniqueArticleSlug } from "@/lib/slugify";
import { applyDistributionPlatforms } from "@/lib/distribution-platform";
import { attachCampaignIntents } from "@/lib/campaign-intent-store";
import {
  appendCampaignAnswersToQuestionHub,
  type QuestionHubEntry,
} from "@/lib/question-hub-store";
import { buildFixedVisibilityQuestionList } from "@/lib/fixed-visibility-simulation";
import { buildCoreQuestionPairs } from "@/lib/core-questions";
import { buildForumHubUrl } from "@/lib/forum-hub-url";
import { buildQuestionHubSlug } from "@/lib/question-hub-slug";
import { buildIntentPostTitle } from "@/lib/geo-prompt";
import {
  appendCampaignTerminalLogs,
  completeCampaignProcessingState,
  failCampaignProcessingState,
  getCampaignProcessingState,
} from "@/lib/campaign-terminal-log-store";

export interface CampaignBackgroundJobInput {
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
}

function buildFallbackMakaleler(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `Alternatif GEO yemleme içeriği ${index + 1}`,
  );
}

async function pushProgressLog(
  campaignId: string,
  category: "ANALİZ" | "YEMLEME" | "DAĞITIM" | "SİSTEM" | "BAŞARI",
  message: string,
): Promise<void> {
  await appendCampaignTerminalLogs(campaignId, [
    buildProgressTerminalLog(category, message),
  ]);
}

export async function processCampaignInBackground(
  input: CampaignBackgroundJobInput,
): Promise<void> {
  const {
    campaignId,
    userId,
    userEmail,
    markaAdi,
    sektor,
    sehir,
    gunlukButce,
    gunSayisi,
    sectorSlug,
    selectedQuestionIds,
    toplamMaliyet,
    agresiflikSeviyesi,
    radarSikligi,
    radarSikligiDakika,
  } = input;

  const makaleSayisi = selectedQuestionIds.length;
  let persistedBaits: Array<{
    id: string;
    baslik: string;
    icerik: string;
    slug: string;
    platform?: string;
  }> = [];

  try {
    await pushProgressLog(
      campaignId,
      "ANALİZ",
      "[ANALİZ] Kemik soru havuzu ve forum thread motoru paralel hazırlanıyor...",
    );

    const selectedQuestionPairs: SelectedQuestionPair[] =
      await buildCoreQuestionPairs(
        selectedQuestionIds,
        sectorSlug as BusinessSector,
        sehir,
        markaAdi,
        sektor,
      );

    const hubEntries: QuestionHubEntry[] = selectedQuestionIds.map(
      (coreQuestionId, index) => ({
        coreQuestionId,
        question: selectedQuestionPairs[index]?.question ?? "",
        simulatedAnswer: selectedQuestionPairs[index]?.simulatedAnswer ?? "",
        city: sehir,
        sectorLabel: sektor,
        sectorSlug: sectorSlug as BusinessSector,
      }),
    );

    const aiBaits = generateAiBaits(markaAdi, sektor, sehir);
    const questionPairsForBaits = selectedQuestionPairs;

    await pushProgressLog(
      campaignId,
      "ANALİZ",
      "[ANALİZ] LLM görünürlük taraması ve yemleme ağı eşzamanlı tetikleniyor...",
    );

    const [llmResult, baitDeployment] = await Promise.all([
      queryLlmInquiry(sehir, sektor, markaAdi, gunlukButce, gunSayisi),
      deployBaitsToNetwork(aiBaits, gunlukButce),
    ]);

    const targetCity = sehir || "Kayseri";
    const targetNiche = sektor || "Diş Kliniği & Sağlık";
    const targetBrand = markaAdi || "Bilinmeyen Marka";
    const currentScore =
      typeof llmResult.yapayZekaGorunurlukOrani === "number"
        ? llmResult.yapayZekaGorunurlukOrani
        : 38;

    await pushProgressLog(
      campaignId,
      "YEMLEME",
      `[YEMLEME] ${makaleSayisi} adet GEO makalesi ve forum yorumları paralel üretiliyor...`,
    );

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

    const primaryForumSlug = hubEntries[0]?.question
      ? buildQuestionHubSlug(hubEntries[0].question)
      : null;

    const billingResult = await finalizeCampaignCreationWithBilling({
      campaignId,
      campaign: {
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
      },
      billing: {
        campaignId,
        userId,
        userEmail,
        businessName: markaAdi,
        sector: sectorSlug || sektor,
        city: sehir,
        amountSpent: toplamMaliyet,
        description: `GEO Kampanya: ${targetBrand} (${targetCity})`,
        forumUrl: primaryForumSlug ? buildForumHubUrl(primaryForumSlug) : null,
      },
    });

    const yeniKampanya = billingResult.campaign;
    if (!yeniKampanya) {
      throw new Error("CAMPAIGN_BILLING_INCOMPLETE");
    }

    persistedBaits = yeniKampanya.baits.map((bait, index) => ({
      id: bait.id,
      baslik: bait.baslik,
      icerik: baitRecords[index]?.icerik ?? bait.icerik,
      slug: bait.slug,
      platform: baitRecords[index]?.platform ?? "WORDPRESS",
    }));

    await attachCampaignIntents(
      yeniKampanya.id,
      questionPairsForBaits,
      persistedBaits,
    );

    await pushProgressLog(
      campaignId,
      "YEMLEME",
      "[YEMLEME] Forum hub cevapları paralel LLM ile yazılıyor...",
    );

    await appendCampaignAnswersToQuestionHub({
      campaignId: yeniKampanya.id,
      brandName: targetBrand,
      entries: hubEntries,
    });

    const growthQuestions =
      selectedQuestionPairs.length > 0
        ? selectedQuestionPairs.map((pair) => pair.question)
        : buildFixedVisibilityQuestionList(sehir);
    await createCampaignGrowthLoop(
      yeniKampanya.id,
      userId,
      growthQuestions,
    );

    await pushProgressLog(
      campaignId,
      "DAĞITIM",
      "[DAĞITIM] WordPress ve dominasyon ağına paralel yayın başlatılıyor...",
    );

    const distributionResults = await distributeBaitsToNetwork(persistedBaits, {
      campaignId,
      markaAdi,
      sehir,
      sektor,
      agresiflik: agresiflikSeviyesi,
    });

    const campaignExternalUrl = distributionResults.find(
      (result) => result.ok && result.externalLiveUrl,
    )?.externalLiveUrl;

    const wordpressUrl =
      distributionResults.find(
        (result) => result.ok && result.externalLiveUrl,
      )?.externalLiveUrl ?? null;

    await updateCampaignLogPublicationUrls(campaignId, { wordpressUrl });

    const primarySlug = persistedBaits[0]?.slug;
    const hubArticles = persistedBaits.map((bait) => ({
      slug: bait.slug,
      hubPath: buildHubArticlePath(bait.slug),
    }));

    const terminalLogs = buildDynamicTerminalLogs(
      {
        markaAdi,
        sektor,
        sehir,
        gunlukButce,
        gunSayisi,
        sectorSlug: sectorSlug as BusinessSector,
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
        sectorSlug: sectorSlug as BusinessSector,
        selectedQuestionIds,
      },
      llmResult,
    );

    const processingState = await getCampaignProcessingState(campaignId);
    const mergedLogs = [
      ...(processingState?.terminalLogs ?? []),
      ...terminalLogs,
    ];

    const result: Partial<CampaignResponse> = {
      success: true,
      campaignId,
      status: "complete",
      metrics,
      terminalLogs: mergedLogs,
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

    await completeCampaignProcessingState(campaignId, mergedLogs, result);
    await releaseCampaignProcessingLock(
      campaignId,
      `GEO operasyonu tamamlandı — skor %${currentScore}`,
    );
  } catch (error) {
    console.error("[CAMPAIGN_BG]: Arka plan işlem hatası:", error);
    const processingState = await getCampaignProcessingState(campaignId);
    const message =
      error instanceof Error ? error.message : "Operasyon tamamlanamadı.";
    await failCampaignProcessingState(
      campaignId,
      processingState?.terminalLogs ?? [],
      message,
    );
    await releaseCampaignProcessingLock(campaignId);
  }
}

export function scheduleCampaignBackgroundJob(
  input: CampaignBackgroundJobInput,
): void {
  void processCampaignInBackground(input);
}
