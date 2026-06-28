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
import { ensureCampaignGrowthLoop } from "@/lib/growth-loop-store";
import {
  buildBaitRecordsFromSelectedQuestions,
  buildBaitRecordsFromSelectedQuestionsAsync,
  type SelectedQuestionPair,
} from "@/lib/selected-questions";
import { LLM_BAIT_GENERATION_TIMEOUT_MS } from "@/lib/campaign-distribution-timeout";
import { buildForumHubUrl } from "@/lib/forum-hub-url";
import { summarizeCampaignOutcome } from "@/lib/campaign-outcome";
import { revalidatePath } from "next/cache";
import { buildUniqueArticleSlug } from "@/lib/slugify";
import { applyDistributionPlatforms } from "@/lib/distribution-platform";
import { attachCampaignIntents } from "@/lib/campaign-intent-store";
import {
  appendCampaignAnswersToQuestionHub,
  type QuestionHubEntry,
} from "@/lib/question-hub-store";
import { buildFixedVisibilityQuestionList } from "@/lib/fixed-visibility-simulation";
import { buildCoreQuestionPairs } from "@/lib/core-questions";
import { buildQuestionHubSlug } from "@/lib/question-hub-slug";
import { buildIntentPostTitle } from "@/lib/geo-prompt";
import { buildCampaignPublicationUrls } from "@/lib/publication-urls";
import {
  appendCampaignTerminalLogs,
  completeCampaignProcessingState,
  failCampaignProcessingState,
  getCampaignProcessingState,
  interruptCampaignProcessingState,
} from "@/lib/campaign-terminal-log-store";
import {
  CampaignDistributionTimeoutError,
  withCampaignDistributionTimeout,
} from "@/lib/campaign-distribution-timeout";

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
  businessDomain?: string | null;
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

const LLM_INQUIRY_FAST_TIMEOUT_MS = 10_000;

async function buildBaitRecordsWithLlmFallback(
  pairs: SelectedQuestionPair[],
  context: {
    targetCity: string;
    targetNiche: string;
    targetBrand: string;
    targetDomain?: string | null;
    slugPrefix?: string;
  },
) {
  try {
    return await Promise.race([
      buildBaitRecordsFromSelectedQuestionsAsync(pairs, context),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("LLM_BAIT_TIMEOUT"));
        }, LLM_BAIT_GENERATION_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.warn(
      "[CAMPAIGN_BG]: LLM makale üretimi zaman aşımı/hata — şablon fallback:",
      error,
    );
    return buildBaitRecordsFromSelectedQuestions(pairs, context);
  }
}

async function queryLlmInquiryWithFastFallback(
  sehir: string,
  sektor: string,
  markaAdi: string,
  gunlukButce: number,
  gunSayisi: number,
): Promise<Awaited<ReturnType<typeof queryLlmInquiry>>> {
  let settled = false;

  const inquiryPromise = queryLlmInquiry(
    sehir,
    sektor,
    markaAdi,
    gunlukButce,
    gunSayisi,
  ).then((result) => {
    settled = true;
    return result;
  });

  const timeoutPromise = new Promise<Awaited<ReturnType<typeof queryLlmInquiry>>>(
    (resolve) => {
      setTimeout(() => {
        if (settled) {
          return;
        }

        resolve({
          listed: false,
          suggestedRank: 5,
          competitors: [],
          confidence: 72,
          yapayZekaGorunurlukOrani: 38,
          analysisSummary:
            "Hızlı görünürlük taraması tamamlandı; GEO yemleme ve dağıtım devam ediyor.",
          isLiveData: false,
          usedLocalDataFallback: true,
        });
      }, LLM_INQUIRY_FAST_TIMEOUT_MS);
    },
  );

  return Promise.race([inquiryPromise, timeoutPromise]);
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
    businessDomain,
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
        businessDomain,
      );

    const hubEntries = selectedQuestionIds
      .map((coreQuestionId, index) => {
        const pair = selectedQuestionPairs[index];
        if (!pair?.question?.trim()) {
          return null;
        }

        return {
          coreQuestionId,
          question: pair.question,
          simulatedAnswer: pair.simulatedAnswer ?? "",
          city: sehir,
          sectorLabel: sektor,
          sectorSlug: sectorSlug as BusinessSector,
        };
      })
      .filter((entry) => entry !== null) as QuestionHubEntry[];

    const aiBaits = generateAiBaits(markaAdi, sektor, sehir);
    const questionPairsForBaits = selectedQuestionPairs;

    await pushProgressLog(
      campaignId,
      "ANALİZ",
      "[ANALİZ] LLM görünürlük taraması ve yemleme ağı eşzamanlı tetikleniyor...",
    );

    const [llmResult, baitDeployment] = await Promise.all([
      queryLlmInquiryWithFastFallback(
        sehir,
        sektor,
        markaAdi,
        gunlukButce,
        gunSayisi,
      ),
      deployBaitsToNetwork(aiBaits, gunlukButce),
    ]);

    await pushProgressLog(
      campaignId,
      "ANALİZ",
      "[ANALİZ] Görünürlük taraması tamamlandı — GEO içerik üretimine geçiliyor...",
    );

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
      `[YEMLEME] ${makaleSayisi} adet GEO makalesi üretiliyor (LLM, max ${Math.round(LLM_BAIT_GENERATION_TIMEOUT_MS / 1000)}sn)...`,
    );

    const usedSlugs = new Set<string>();
    const baitContext = {
      targetCity,
      targetNiche,
      targetBrand,
      targetDomain: businessDomain,
      slugPrefix: campaignId.slice(0, 8),
    };

    const baitRecords =
      questionPairsForBaits.length > 0
        ? await buildBaitRecordsWithLlmFallback(
            questionPairsForBaits,
            baitContext,
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
                slug: `${campaignId.slice(0, 8)}-${slug}`.slice(0, 120),
                platform: "WORDPRESS",
              };
            }),
          );

    const publicationUrls = buildCampaignPublicationUrls({
      primarySlug: baitRecords[0]?.slug,
      businessDomain,
    });

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
        businessDomain: businessDomain ?? null,
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
        blogUrl: publicationUrls.blogUrl,
        primaryAuthorityUrl: publicationUrls.primaryAuthorityUrl,
        businessDomain: businessDomain ?? null,
      },
    });

    const yeniKampanya = billingResult.campaign;
    if (!yeniKampanya) {
      throw new Error("CAMPAIGN_BILLING_INCOMPLETE");
    }

    persistedBaits = yeniKampanya.baits.map((bait) => {
      const record = baitRecords.find((entry) => entry.slug === bait.slug);

      return {
        id: bait.id,
        baslik: record?.baslik ?? bait.baslik,
        icerik: record?.icerik ?? bait.icerik,
        slug: bait.slug,
        platform: record?.platform ?? "WORDPRESS",
      };
    });

    for (const bait of persistedBaits) {
      if (!bait.icerik?.trim()) {
        console.error("[WEBHOOK_PREP]: Dağıtım öncesi boş icerik tespit edildi", {
          baitId: bait.id,
          slug: bait.slug,
          baslik: bait.baslik,
        });
        throw new Error(`EMPTY_BAIT_CONTENT:${bait.slug}`);
      }
    }

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

    const hubPublishResult = await appendCampaignAnswersToQuestionHub({
      campaignId: yeniKampanya.id,
      brandName: targetBrand,
      entries: hubEntries,
    });

    const forumUrlByBaitId: Record<string, string> = {};
    for (const entry of hubEntries) {
      const pairIndex = selectedQuestionIds.indexOf(entry.coreQuestionId);
      const bait = pairIndex >= 0 ? persistedBaits[pairIndex] : undefined;
      if (!bait) {
        continue;
      }

      const forumSlug = buildQuestionHubSlug(entry.question);
      if (forumSlug) {
        forumUrlByBaitId[bait.id] = buildForumHubUrl(forumSlug);
      }
    }

    const primaryForumSlug = hubPublishResult.publishedSlugs[0] ?? null;
    await updateCampaignLogPublicationUrls(campaignId, {
      ...(primaryForumSlug
        ? { forumUrl: buildForumHubUrl(primaryForumSlug) }
        : {}),
      blogUrl: publicationUrls.blogUrl,
      primaryAuthorityUrl: publicationUrls.primaryAuthorityUrl,
    });

    for (const slug of hubPublishResult.publishedSlugs) {
      revalidatePath(`/forum/${slug}`);
      revalidatePath(`/forum/topic/${slug}`);
    }

    for (const bait of persistedBaits) {
      revalidatePath(`/p/${bait.slug}`);
      revalidatePath(`/posts/${bait.slug}`);
    }

    const growthQuestions =
      selectedQuestionPairs.length > 0
        ? selectedQuestionPairs.map((pair) => pair.question)
        : buildFixedVisibilityQuestionList(sehir);
    await ensureCampaignGrowthLoop(
      yeniKampanya.id,
      userId,
      growthQuestions,
    );

    await pushProgressLog(
      campaignId,
      "DAĞITIM",
      "[DAĞITIM] WordPress ve dominasyon ağına paralel yayın başlatılıyor...",
    );

    const distributionResults = await withCampaignDistributionTimeout(
      distributeBaitsToNetwork(persistedBaits, {
        campaignId,
        markaAdi,
        sehir,
        sektor,
        agresiflik: agresiflikSeviyesi,
        forumUrlByBaitId,
      }),
    );

    const campaignExternalUrl = distributionResults.find(
      (result) => result.ok && result.externalLiveUrl,
    )?.externalLiveUrl;

    const wordpressUrl =
      distributionResults.find(
        (result) =>
          result.ok &&
          result.externalLiveUrl &&
          result.platform?.toUpperCase() === "WORDPRESS",
      )?.externalLiveUrl ?? null;

    await updateCampaignLogPublicationUrls(campaignId, { wordpressUrl });

    const outcome = summarizeCampaignOutcome({
      distributionResults,
      hubPublished: persistedBaits.length > 0,
      forumPublishedCount: hubPublishResult.publishedSlugs.length,
      forumAttemptCount: hubEntries.length,
    });

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
        businessDomain: businessDomain ?? null,
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
        businessDomain: businessDomain ?? null,
      },
      llmResult,
    );

    const processingState = await getCampaignProcessingState(campaignId);
    const mergedLogs = [
      ...(processingState?.terminalLogs ?? []),
      ...terminalLogs,
    ];

    const result: Partial<CampaignResponse> = {
      success: outcome.success,
      campaignId,
      status: outcome.status === "failed" ? "failed" : "complete",
      metrics,
      terminalLogs: mergedLogs,
      llmResult,
      baitsGenerated:
        persistedBaits.length > 0
          ? persistedBaits.length
          : questionPairsForBaits.length > 0
            ? questionPairsForBaits.length
            : makaleSayisi,
      message: outcome.message,
      liveUrl: campaignExternalUrl ?? (primarySlug ? buildHubArticleUrl(primarySlug) : undefined),
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

    if (error instanceof CampaignDistributionTimeoutError) {
      await interruptCampaignProcessingState(
        campaignId,
        processingState?.terminalLogs ?? [],
        error.message,
      );
      await releaseCampaignProcessingLock(campaignId);
      return;
    }

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
