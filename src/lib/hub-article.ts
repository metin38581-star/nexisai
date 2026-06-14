import "server-only";

import { prisma } from "@/lib/db";
import { getSupabasePublic } from "@/lib/supabase-public";

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

export async function fetchHubArticleBySlug(
  slug: string,
): Promise<HubArticle | null> {
  try {
    const supabase = getSupabasePublic();
    const { data, error } = await supabase
      .from("Bait")
      .select(
        "id, slug, baslik, icerik, createdAt, external_live_url, Campaign(sehir, sektor, markaAdi)",
      )
      .eq("slug", slug)
      .single();

    if (!error && data) {
      return mapBaitRow(data as BaitRow);
    }
  } catch {
    // Supabase yapılandırması yoksa Prisma fallback
  }

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
    sehir: bait.campaign.sehir,
    sektor: bait.campaign.sektor,
    markaAdi: bait.campaign.markaAdi,
  };
}
