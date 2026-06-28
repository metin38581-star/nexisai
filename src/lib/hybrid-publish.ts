import "server-only";

import { dispatchToCentralWebhook } from "@/lib/geo-distribution-client";
import { normalizeMakeWebhookPayload } from "@/lib/make-webhook-payload";
import { buildHubArticleUrl } from "@/lib/hub-url";
import { updateCampaignExternalLiveUrl } from "@/lib/supabase-campaign";
import { prisma } from "@/lib/db";

export interface HybridPublishInput {
  campaignId: string;
  baitId: string;
  baslik: string;
  icerik: string;
  slug: string;
  markaAdi: string;
  sehir: string;
  sektor: string;
  agresiflik: string;
}

export interface HybridPublishResult {
  message: string;
  nexisUrl: string;
  externalUrl: string | null;
  ok: boolean;
}

/**
 * NexisAI Hub + Make.com hibrid yayın akışı.
 * 1) İçerik zaten Supabase'e (Bait/Campaign) kaydedilmiş olmalı
 * 2) Make.com webhook tetiklenir (await)
 * 3) Dönen live_url → Campaign.external_live_url + Bait.external_live_url
 */
export async function publishToHubAndMake(
  input: HybridPublishInput,
): Promise<HybridPublishResult> {
  const nexisUrl = buildHubArticleUrl(input.slug);

  const makeResult = await dispatchToCentralWebhook(
    normalizeMakeWebhookPayload({
      campaignId: input.campaignId,
      baslik: input.baslik,
      icerik: input.icerik,
      slug: input.slug,
      markaAdi: input.markaAdi,
      sehir: input.sehir,
      sektor: input.sektor,
      agresiflik: input.agresiflik,
    }),
  );

  let externalUrl: string | null = null;

  if (makeResult.ok && makeResult.externalLiveUrl) {
    externalUrl = makeResult.externalLiveUrl;

    await updateCampaignExternalLiveUrl(input.campaignId, externalUrl);

    await prisma.bait.update({
      where: { id: input.baitId },
      data: {
        yayinlandi: true,
        status: "SUCCESS",
        externalLiveUrl: externalUrl,
        liveUrl: externalUrl,
      },
    });

    await prisma.campaign.update({
      where: { id: input.campaignId },
      data: {
        externalLiveUrl: externalUrl,
        liveUrl: externalUrl,
      },
    });
  } else if (makeResult.ok) {
    await prisma.bait.update({
      where: { id: input.baitId },
      data: {
        yayinlandi: true,
        status: "SUCCESS",
      },
    });
  }

  return {
    message: makeResult.ok
      ? "İçerikler başarıyla yayınlandı!"
      : "NexisAI Hub kaydı tamamlandı; dış dağıtım yanıt vermedi.",
    nexisUrl,
    externalUrl,
    ok: makeResult.ok,
  };
}
