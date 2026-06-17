import "server-only";

/**
 * NexisAI Hub — hibrid dağıtım motoru.
 * Medium: native API | WordPress: native REST API | Blogger: Make.com webhook
 */

import {
  runMultiDistributionPipeline,
  type DistributionProgressListener,
  type GeoDistributionContext,
} from "@/lib/distribution-core";
import { dispatchToCentralWebhook } from "@/lib/geo-distribution-client";
import { publishToMedium } from "@/lib/medium-publish";
import { publishToWordPress } from "@/lib/wordpress-publish";
import { updateBaitPublication } from "@/lib/bait-publication-update";
import { prisma } from "@/lib/db";
import { updateCampaignExternalLiveUrl } from "@/lib/supabase-campaign";

export interface DistributionBait {
  id: string;
  baslik: string;
  icerik: string;
  slug: string;
  platform?: string;
}

export interface DistributionResult {
  baitId: string;
  slug: string;
  ok: boolean;
  externalLiveUrl?: string;
  platform?: string;
}

function normalizePlatform(platform?: string): string {
  return platform?.trim().toUpperCase() ?? "";
}

async function markBaitPublished(
  baitId: string,
  liveUrl?: string,
  externalLiveUrl?: string,
): Promise<void> {
  await updateBaitPublication({
    baitId,
    liveUrl,
    externalLiveUrl: externalLiveUrl ?? liveUrl,
  });
}

async function saveCampaignExternalUrl(
  campaignId: string,
  externalLiveUrl: string,
): Promise<void> {
  await updateCampaignExternalLiveUrl(campaignId, externalLiveUrl);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      externalLiveUrl,
      liveUrl: externalLiveUrl,
    },
  });
}

async function maybeSaveCampaignUrl(
  campaignId: string,
  url: string | undefined,
  campaignExternalUrlSaved: { value: boolean },
): Promise<void> {
  if (!url || campaignExternalUrlSaved.value) {
    return;
  }

  try {
    await saveCampaignExternalUrl(campaignId, url);
    campaignExternalUrlSaved.value = true;
  } catch (error) {
    console.error("[DAĞITIM]: Kampanya URL kaydı başarısız:", error);
  }
}

async function publishBaitToMedium(
  bait: DistributionBait,
): Promise<DistributionResult> {
  try {
    const result = await publishToMedium({
      title: bait.baslik,
      html: bait.icerik,
    });

    if (!result.ok || !result.url) {
      console.warn(
        `[MEDIUM GÜVENLİ MOD]: /p/${bait.slug} — ${result.error ?? "yayınlanamadı"}; NexisAI Hub yayını korunuyor.`,
      );
      return {
        baitId: bait.id,
        slug: bait.slug,
        ok: false,
        platform: "MEDIUM",
      };
    }

    await markBaitPublished(bait.id, result.url, result.url);

    console.log(`[MEDIUM]: ${bait.baslik} → ${result.url} (Bait ${bait.id})`);

    return {
      baitId: bait.id,
      slug: bait.slug,
      ok: true,
      externalLiveUrl: result.url,
      platform: "MEDIUM",
    };
  } catch (error) {
    console.error(
      `[MEDIUM HATA]: Bait ${bait.id} yayınlanamadı — kampanya devam ediyor:`,
      error,
    );

    return {
      baitId: bait.id,
      slug: bait.slug,
      ok: false,
      platform: "MEDIUM",
    };
  }
}

async function publishBaitToWordPress(
  bait: DistributionBait,
): Promise<DistributionResult> {
  try {
    const result = await publishToWordPress({
      title: bait.baslik,
      content: bait.icerik,
    });

    if (!result.ok || !result.url) {
      console.warn(
        `[WORDPRESS GÜVENLİ MOD]: /p/${bait.slug} — ${result.error ?? "yayınlanamadı"}; NexisAI Hub yayını korunuyor.`,
      );
      return {
        baitId: bait.id,
        slug: bait.slug,
        ok: false,
        platform: "WORDPRESS",
      };
    }

    await markBaitPublished(bait.id, result.url, result.url);

    console.log(
      `[WORDPRESS]: ${bait.baslik} → ${result.url} (Bait ${bait.id})`,
    );

    return {
      baitId: bait.id,
      slug: bait.slug,
      ok: true,
      externalLiveUrl: result.url,
      platform: "WORDPRESS",
    };
  } catch (error) {
    console.error(
      `[WORDPRESS HATA]: Bait ${bait.id} yayınlanamadı — kampanya devam ediyor:`,
      error,
    );

    return {
      baitId: bait.id,
      slug: bait.slug,
      ok: false,
      platform: "WORDPRESS",
    };
  }
}

export async function distributeBaitsToNetwork(
  baits: DistributionBait[],
  context: GeoDistributionContext,
  onProgress?: DistributionProgressListener,
): Promise<DistributionResult[]> {
  if (baits.length === 0) {
    return [];
  }

  const results: DistributionResult[] = [];
  const campaignExternalUrlSaved = { value: false };

  const mediumBaits = baits.filter(
    (bait) => normalizePlatform(bait.platform) === "MEDIUM",
  );
  const wordpressBaits = baits.filter(
    (bait) => normalizePlatform(bait.platform) === "WORDPRESS",
  );
  const bloggerBaits = baits.filter(
    (bait) => normalizePlatform(bait.platform) === "BLOGGER",
  );

  for (const bait of mediumBaits) {
    const result = await publishBaitToMedium(bait);
    results.push(result);
    await maybeSaveCampaignUrl(
      context.campaignId,
      result.externalLiveUrl,
      campaignExternalUrlSaved,
    );
  }

  for (const bait of wordpressBaits) {
    const result = await publishBaitToWordPress(bait);
    results.push(result);
    await maybeSaveCampaignUrl(
      context.campaignId,
      result.externalLiveUrl,
      campaignExternalUrlSaved,
    );
  }

  if (bloggerBaits.length === 0) {
    return results;
  }

  const articles = bloggerBaits.map(({ baslik, icerik, slug }) => ({
    baslik,
    icerik,
    slug,
  }));

  await runMultiDistributionPipeline(
    articles,
    context,
    async (payload) => {
      const result = await dispatchToCentralWebhook(payload);
      return { ok: result.ok, externalLiveUrl: result.externalLiveUrl };
    },
    (event) => {
      onProgress?.(event);
    },
    {
      latencyMs: 0,
      onArticleResult: async (index, result) => {
        const bait = bloggerBaits[index];
        if (!bait) {
          return;
        }

        if (result.ok) {
          try {
            await markBaitPublished(
              bait.id,
              result.externalLiveUrl,
              result.externalLiveUrl,
            );

            await maybeSaveCampaignUrl(
              context.campaignId,
              result.externalLiveUrl,
              campaignExternalUrlSaved,
            );

            console.log(
              `[BLOGGER WEBHOOK]: /p/${bait.slug} — Bait ${bait.id} SUCCESS${result.externalLiveUrl ? ` → ${result.externalLiveUrl}` : ""}.`,
            );
            results.push({
              baitId: bait.id,
              slug: bait.slug,
              ok: true,
              externalLiveUrl: result.externalLiveUrl,
              platform: bait.platform,
            });
          } catch (dbError) {
            console.error(
              `[BLOGGER WEBHOOK] Başarılı ancak kayıt güncellenemedi (${bait.id}):`,
              dbError,
            );
            results.push({
              baitId: bait.id,
              slug: bait.slug,
              ok: true,
              externalLiveUrl: result.externalLiveUrl,
              platform: bait.platform,
            });
          }
          return;
        }

        console.error(
          `[BLOGGER WEBHOOK HATASI]: /p/${bait.slug} — webhook reddetti; NexisAI Hub yayını korunuyor.`,
        );
        results.push({
          baitId: bait.id,
          slug: bait.slug,
          ok: false,
          platform: bait.platform,
        });
      },
    },
  );

  return results;
}

export type {
  DistributionPhase,
  DistributionProgressEvent,
  DistributionProgressListener,
  GeoDistributionContext,
  GeoWebhookPayload,
} from "@/lib/distribution-core";
