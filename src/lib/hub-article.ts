import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabasePublic } from "@/lib/supabase-public";
import { hasDatabaseUrl, hasSupabaseAdminEnv } from "@/lib/server-env";
import { isPublishedBaitRecord } from "@/lib/bait-publish-status";

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
  userId: string | null;
  campaignId: string | null;
}

type HubArticleScope = {
  userId?: string;
  campaignId?: string;
};

type CampaignSummary = {
  sehir: string;
  sektor: string;
  markaAdi: string;
};

async function fetchHubArticleViaSupabase(
  client: SupabaseClient,
  slug: string,
  source: "admin" | "public",
  scope?: HubArticleScope,
): Promise<HubArticle | null> {
  let baitQuery = client
    .from("Bait")
    .select(
      "id, slug, baslik, icerik, createdAt, external_live_url, campaignId, user_id, yayinlandi, status",
    )
    .eq("slug", slug);

  if (scope?.campaignId) {
    baitQuery = baitQuery.eq("campaignId", scope.campaignId);
  }

  if (scope?.userId) {
    baitQuery = baitQuery.eq("user_id", scope.userId);
  }

  const { data: bait, error: baitError } = await baitQuery
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (baitError) {
    console.error(`[HUB_ARTICLE] Supabase ${source} bait fetch error:`, baitError);
    return null;
  }

  if (!bait || !isPublishedBaitRecord(bait)) {
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
    userId: (bait.user_id as string | null) ?? null,
    campaignId: bait.campaignId ?? null,
  };
}

async function fetchHubArticleViaPrisma(
  slug: string,
  scope?: HubArticleScope,
): Promise<HubArticle | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    const bait = await prisma.bait.findFirst({
      where: {
        slug,
        ...(scope?.campaignId ? { campaignId: scope.campaignId } : {}),
        ...(scope?.userId ? { userId: scope.userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { campaign: true },
    });

    if (!bait || !isPublishedBaitRecord(bait)) {
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
      userId: bait.userId,
      campaignId: bait.campaignId,
    };
  } catch (error) {
    console.error("[HUB_ARTICLE] Prisma fetch failed:", error);
    return null;
  }
}

export async function fetchHubArticleBySlug(
  slug: string,
  scope?: HubArticleScope,
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
        scope,
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
      scope,
    );
    if (article) {
      return article;
    }
  } catch {
    // Anon Supabase yapılandırması yoksa Prisma fallback
  }

  return fetchHubArticleViaPrisma(normalizedSlug, scope);
}

export async function fetchHubArticlesForCampaign(input: {
  userId: string;
  campaignId: string;
}): Promise<HubArticle[]> {
  if (hasDatabaseUrl()) {
    try {
      const rows = await prisma.bait.findMany({
        where: {
          userId: input.userId,
          campaignId: input.campaignId,
        },
        orderBy: { createdAt: "asc" },
        include: { campaign: true },
      });

      return rows
        .filter((bait) => isPublishedBaitRecord(bait))
        .map((bait) => ({
          id: bait.id,
          slug: bait.slug,
          title: bait.baslik,
          content: bait.icerik,
          createdAt: bait.createdAt.toISOString(),
          externalLiveUrl: bait.externalLiveUrl,
          sehir: bait.campaign?.sehir ?? null,
          sektor: bait.campaign?.sektor ?? null,
          markaAdi: bait.campaign?.markaAdi ?? null,
          userId: bait.userId,
          campaignId: bait.campaignId,
        }));
    } catch (error) {
      console.error("[HUB_ARTICLE] Prisma kampanya bait listesi hatası:", error);
    }
  }

  if (!hasSupabaseAdminEnv()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Bait")
    .select(
      "id, slug, baslik, icerik, createdAt, external_live_url, campaignId, user_id, yayinlandi, status",
    )
    .eq("campaignId", input.campaignId)
    .eq("user_id", input.userId)
    .order("createdAt", { ascending: true });

  if (error) {
    console.error("[HUB_ARTICLE] Supabase kampanya bait listesi hatası:", error);
    return [];
  }

  const articles: HubArticle[] = [];

  for (const bait of data ?? []) {
    if (!isPublishedBaitRecord(bait)) {
      continue;
    }

    let campaign: CampaignSummary | null = null;
    const { data: campaignRow } = await supabase
      .from("Campaign")
      .select("sehir, sektor, markaAdi")
      .eq("id", bait.campaignId)
      .maybeSingle();

    if (campaignRow) {
      campaign = campaignRow as CampaignSummary;
    }

    articles.push({
      id: bait.id as string,
      slug: bait.slug as string,
      title: bait.baslik as string,
      content: bait.icerik as string,
      createdAt: bait.createdAt as string,
      externalLiveUrl: (bait.external_live_url as string | null) ?? null,
      sehir: campaign?.sehir ?? null,
      sektor: campaign?.sektor ?? null,
      markaAdi: campaign?.markaAdi ?? null,
      userId: (bait.user_id as string | null) ?? null,
      campaignId: (bait.campaignId as string | null) ?? null,
    });
  }

  return articles;
}
