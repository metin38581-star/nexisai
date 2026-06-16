import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabasePublic } from "@/lib/supabase-public";
import { hasDatabaseUrl, hasSupabaseAdminEnv } from "@/lib/server-env";

export interface HubArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: string;
  externalLiveUrl: string | null;
  sehir: string | null;
  sektor: string | null;
  markaAdi: string | null;
}

type CampaignSummary = {
  sehir: string;
  sektor: string;
  markaAdi: string;
};

async function fetchHubArticleViaSupabase(
  client: SupabaseClient,
  slug: string,
  source: "admin" | "public",
): Promise<HubArticle | null> {
  const { data: bait, error: baitError } = await client
    .from("Bait")
    .select(
      "id, slug, baslik, icerik, createdAt, external_live_url, campaignId",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (baitError) {
    console.error(`[HUB_ARTICLE] Supabase ${source} bait fetch error:`, baitError);
    return null;
  }

  if (!bait) {
    return null;
  }

  let campaign: CampaignSummary | null = null;

  if (bait.campaignId) {
    const { data: campaignRow, error: campaignError } = await client
      .from("Campaign")
      .select("sehir, sektor, markaAdi")
      .eq("id", bait.campaignId)
      .maybeSingle();

    if (campaignError) {
      console.error(
        `[HUB_ARTICLE] Supabase ${source} campaign fetch error:`,
        campaignError,
      );
    } else if (campaignRow) {
      campaign = campaignRow as CampaignSummary;
    }
  }

  return {
    id: bait.id,
    slug: bait.slug,
    title: bait.baslik,
    content: bait.icerik,
    createdAt: bait.createdAt,
    externalLiveUrl: bait.external_live_url ?? null,
    sehir: campaign?.sehir ?? null,
    sektor: campaign?.sektor ?? null,
    markaAdi: campaign?.markaAdi ?? null,
  };
}

async function fetchHubArticleViaPrisma(
  slug: string,
): Promise<HubArticle | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    const bait = await prisma.bait.findUnique({
      where: { slug },
      include: { campaign: true },
    });

    if (!bait) {
      return null;
    }

    return {
      id: bait.id,
      slug: bait.slug,
      title: bait.baslik,
      content: bait.icerik,
      createdAt: bait.createdAt.toISOString(),
      externalLiveUrl: bait.externalLiveUrl,
      sehir: bait.campaign?.sehir ?? null,
      sektor: bait.campaign?.sektor ?? null,
      markaAdi: bait.campaign?.markaAdi ?? null,
    };
  } catch (error) {
    console.error("[HUB_ARTICLE] Prisma fetch failed:", error);
    return null;
  }
}

export async function fetchHubArticleBySlug(
  slug: string,
): Promise<HubArticle | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return null;
  }

  if (hasSupabaseAdminEnv()) {
    try {
      const article = await fetchHubArticleViaSupabase(
        getSupabaseAdmin(),
        normalizedSlug,
        "admin",
      );
      if (article) {
        return article;
      }
    } catch (error) {
      console.error("[HUB_ARTICLE] Supabase admin fetch failed:", error);
    }
  }

  try {
    const article = await fetchHubArticleViaSupabase(
      getSupabasePublic(),
      normalizedSlug,
      "public",
    );
    if (article) {
      return article;
    }
  } catch {
    // Anon Supabase yapılandırması yoksa Prisma fallback
  }

  return fetchHubArticleViaPrisma(normalizedSlug);
}
