import "server-only";

/**
 * NexisAI Hub — hibrid dağıtım motoru.
 * İç yayın: /p/{slug} | Dış yayın: Make.com → external_live_url
 */

import {
  runMultiDistributionPipeline,
  type DistributionProgressListener,
  type GeoDistributionContext,
} from "@/lib/distribution-core";
import { dispatchToCentralWebhook } from "@/lib/geo-distribution-client";
import { prisma } from "@/lib/db";
import { updateCampaignExternalLiveUrl } from "@/lib/supabase-campaign";

export interface DistributionBait {
  id: string;
  baslik: string;
  icerik: string;
  slug: string;
}

export interface DistributionResult {
  baitId: string;
  slug: string;
  ok: boolean;
  externalLiveUrl?: string;
}

async function markBaitPublished(
  baitId: string,
  externalLiveUrl?: string,
): Promise<void> {
  await prisma.bait.update({
    where: { id: baitId },
    data: {
      yayinlandi: true,
      status: "PUBLISHED",
      ...(externalLiveUrl ? { externalLiveUrl } : {}),
    },
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

export async function distributeBaitsToNetwork(
  baits: DistributionBait[],
  context: GeoDistributionContext,
  onProgress?: DistributionProgressListener,
): Promise<DistributionResult[]> {
  if (baits.length === 0) {
    return [];
  }

  const results: DistributionResult[] = [];
  const articles = baits.map(({ baslik, icerik, slug }) => ({
    baslik,
    icerik,
    slug,
  }));
  let campaignExternalUrlSaved = false;

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
        const bait = baits[index];
        if (!bait) {
          return;
        }

        if (result.ok) {
          try {
            await markBaitPublished(bait.id, result.externalLiveUrl);

            if (result.externalLiveUrl && !campaignExternalUrlSaved) {
              await saveCampaignExternalUrl(
                context.campaignId,
                result.externalLiveUrl,
              );
              campaignExternalUrlSaved = true;
            }

            console.log(
              `[NEXISAI HUB]: /p/${bait.slug} — Bait ${bait.id} SUCCESS${result.externalLiveUrl ? ` → ${result.externalLiveUrl}` : ""}.`,
            );
            results.push({
              baitId: bait.id,
              slug: bait.slug,
              ok: true,
              externalLiveUrl: result.externalLiveUrl,
            });
          } catch (dbError) {
            console.error(
              `[NEXISAI HUB] Webhook başarılı ancak kayıt güncellenemedi (${bait.id}):`,
              dbError,
            );
            results.push({
              baitId: bait.id,
              slug: bait.slug,
              ok: true,
              externalLiveUrl: result.externalLiveUrl,
            });
          }
          return;
        }

        console.error(
          `[NEXISAI HUB HATASI]: /p/${bait.slug} — Dış webhook reddetti; NexisAI Hub yayını korunuyor.`,
        );
        results.push({ baitId: bait.id, slug: bait.slug, ok: false });
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
