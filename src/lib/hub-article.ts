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

type BaitRow = {
  id: string;
  slug: string;
  baslik: string;
  icerik: string;
  createdAt: string;
  external_live_url?: string | null;
  externalLiveUrl?: string | null;
  Campaign?: CampaignSummary | CampaignSummary[] | null;
};

function normalizeCampaign(
  campaign: BaitRow["Campaign"],
): CampaignSummary | null {
  if (!campaign) {
    return null;
  }

  return Array.isArray(campaign) ? (campaign[0] ?? null) : campaign;
}

function mapBaitRow(row: BaitRow): HubArticle {
  const campaign = normalizeCampaign(row.Campaign);

  return {
    id: row.id,
    slug: row.slug,
    title: row.baslik,
    content: row.icerik,
    createdAt: row.createdAt,
    externalLiveUrl: row.external_live_url ?? row.externalLiveUrl ?? null,
    sehir: campaign?.sehir ?? null,
    sektor: campaign?.sektor ?? null,
    markaAdi: campaign?.markaAdi ?? null,
  };
}

async function fetchHubArticleViaSupabase(
  client: SupabaseClient,
  slug: string,
): Promise<HubArticle | null> {
  const { data, error } = await client
    .from("Bait")
    .select(
      "id, slug, baslik, icerik, createdAt, external_live_url, Campaign(sehir, sektor, markaAdi)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapBaitRow(data as BaitRow);
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
    );
    if (article) {
      return article;
    }
  } catch {
    // Anon Supabase yapılandırması yoksa Prisma fallback
  }

  return fetchHubArticleViaPrisma(normalizedSlug);
}
