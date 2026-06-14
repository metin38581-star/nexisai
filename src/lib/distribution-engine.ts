import "server-only";

/**
 * Sunucu tarafı çoklu makale dağıtım motoru.
 * Her bait için buildGeoWebhookPayload() ile kurumsal JSON paketi oluşturulur
 * ve geo-distribution-client üzerinden NEXT_PUBLIC_GEO_API_URL'e POST edilir.
 */

import {  runMultiDistributionPipeline,
  type DistributionProgressListener,
  type GeoDistributionContext,
} from "@/lib/distribution-core";
import { dispatchToCentralWebhook } from "@/lib/geo-distribution-client";
import { prisma } from "@/lib/db";

export interface DistributionBait {
  id: string;
  baslik: string;
  icerik: string;
}

async function markBaitPublished(baitId: string): Promise<void> {
  await prisma.bait.update({
    where: { id: baitId },
    data: {
      yayinlandi: true,
      status: "SUCCESS",
    },
  });
}

async function markBaitFailed(baitId: string): Promise<void> {
  await prisma.bait.update({
    where: { id: baitId },
    data: {
      status: "FAILED",
    },
  });
}

export async function distributeBaitsToNetwork(
  baits: DistributionBait[],
  context: GeoDistributionContext,
  onProgress?: DistributionProgressListener,
): Promise<void> {
  if (baits.length === 0) {
    return;
  }

  const articles = baits.map(({ baslik, icerik }) => ({ baslik, icerik }));

  await runMultiDistributionPipeline(
    articles,
    context,
    async (payload) => {
      const result = await dispatchToCentralWebhook(payload);
      return { ok: result.ok };
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
            await markBaitPublished(bait.id);
            console.log(
              `[GEO DAĞITIM]: "${bait.baslik}" — ${context.markaAdi} (${context.agresiflik}) webhook'a iletildi, Bait ${bait.id} SUCCESS.`,
            );
          } catch (dbError) {
            console.error(
              `[GEO DAĞITIM] Webhook başarılı ancak Bait güncellenemedi (${bait.id}):`,
              dbError,
            );
          }
          return;
        }

        try {
          await markBaitFailed(bait.id);
        } catch (dbError) {
          console.error(
            `[GEO DAĞITIM] Bait FAILED durumu yazılamadı (${bait.id}):`,
            dbError,
          );
        }
        console.error(`[GEO DAĞITIM HATASI]: "${bait.baslik}" — webhook reddetti.`);
      },
    },
  );
}

export type {
  DistributionPhase,
  DistributionProgressEvent,
  DistributionProgressListener,
  GeoDistributionContext,
  GeoWebhookPayload,
} from "@/lib/distribution-core";
