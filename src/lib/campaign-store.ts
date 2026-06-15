import "server-only";

import type { StoredBait, StoredCampaign } from "@/types/campaign";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";

type SupabaseBaitRow = {
  id: string;
  campaignId: string;
  baslik: string;
  icerik: string;
  slug: string;
  platform: string;
  yayinlandi: boolean;
  status: string;
  live_url: string | null;
  external_live_url: string | null;
  createdAt: string;
};

type SupabaseCampaignRow = {
  id: string;
  userId: string | null;
  sehir: string;
  sektor: string;
  markaAdi: string;
  skor: number;
  gunlukButce: number;
  gunSayisi: number;
  agresiflik: string;
  makaleSayisi: number;
  radarSikligi: string;
  radarSikligiDakika: number;
  isOptimized: boolean;
  lastCheckedAt: string | null;
  llmFeedback: string | null;
  live_url: string | null;
  external_live_url: string | null;
  createdAt: string;
  Bait?: SupabaseBaitRow[] | null;
};

function mapBait(row: SupabaseBaitRow): StoredBait {
  return {
    id: row.id,
    campaignId: row.campaignId,
    baslik: row.baslik,
    icerik: row.icerik,
    slug: row.slug,
    platform: row.platform,
    yayinlandi: row.yayinlandi,
    status: row.status,
    liveUrl: row.live_url,
    externalLiveUrl: row.external_live_url,
    createdAt: row.createdAt,
  };
}

function mapCampaign(row: SupabaseCampaignRow): StoredCampaign {
  return {
    id: row.id,
    userId: row.userId,
    sehir: row.sehir,
    sektor: row.sektor,
    markaAdi: row.markaAdi,
    skor: row.skor,
    gunlukButce: row.gunlukButce,
    gunSayisi: row.gunSayisi,
    agresiflik: row.agresiflik,
    makaleSayisi: row.makaleSayisi,
    radarSikligi: row.radarSikligi,
    radarSikligiDakika: row.radarSikligiDakika,
    isOptimized: row.isOptimized,
    lastCheckedAt: row.lastCheckedAt,
    llmFeedback: row.llmFeedback,
    liveUrl: row.live_url,
    externalLiveUrl: row.external_live_url,
    createdAt: row.createdAt,
    baits: (row.Bait ?? []).map(mapBait),
  };
}

async function listCampaignsByUserViaPrisma(
  userId: string,
): Promise<StoredCampaign[]> {
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    include: { baits: true },
    orderBy: { createdAt: "desc" },
  });

  return campaigns as unknown as StoredCampaign[];
}

async function listCampaignsByUserViaSupabase(
  userId: string,
): Promise<StoredCampaign[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Campaign")
    .select("*, Bait(*)")
    .eq("userId", userId)
    .order("createdAt", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapCampaign(row as SupabaseCampaignRow));
}

export async function listCampaignsByUserId(
  userId: string,
): Promise<StoredCampaign[]> {
  if (hasDatabaseUrl()) {
    try {
      return await listCampaignsByUserViaPrisma(userId);
    } catch (error) {
      console.error("API Hatası:", error);
    }
  }

  return listCampaignsByUserViaSupabase(userId);
}

export interface RadarCampaignRecord {
  id: string;
  markaAdi: string;
  sehir: string;
  sektor: string;
  radarSikligiDakika: number | null;
  lastCheckedAt: Date | null;
  createdAt: Date;
  isOptimized: boolean;
  llmFeedback: string | null;
}

async function listRadarCampaignsViaPrisma(): Promise<RadarCampaignRecord[]> {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
  });

  return campaigns.map((campaign) => ({
    id: campaign.id,
    markaAdi: campaign.markaAdi,
    sehir: campaign.sehir,
    sektor: campaign.sektor,
    radarSikligiDakika: campaign.radarSikligiDakika,
    lastCheckedAt: campaign.lastCheckedAt,
    createdAt: campaign.createdAt,
    isOptimized: campaign.isOptimized,
    llmFeedback: campaign.llmFeedback,
  }));
}

async function listRadarCampaignsViaSupabase(): Promise<RadarCampaignRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Campaign")
    .select(
      "id, markaAdi, sehir, sektor, radarSikligiDakika, lastCheckedAt, createdAt, isOptimized, llmFeedback",
    )
    .order("createdAt", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((campaign) => ({
    id: campaign.id,
    markaAdi: campaign.markaAdi,
    sehir: campaign.sehir,
    sektor: campaign.sektor,
    radarSikligiDakika: campaign.radarSikligiDakika,
    lastCheckedAt: campaign.lastCheckedAt
      ? new Date(campaign.lastCheckedAt)
      : null,
    createdAt: new Date(campaign.createdAt),
    isOptimized: campaign.isOptimized,
    llmFeedback: campaign.llmFeedback,
  }));
}

export async function listRadarCampaigns(): Promise<RadarCampaignRecord[]> {
  if (hasDatabaseUrl()) {
    try {
      return await listRadarCampaignsViaPrisma();
    } catch (error) {
      console.error("API Hatası:", error);
    }
  }

  return listRadarCampaignsViaSupabase();
}

export interface CampaignBaitInput {
  baslik: string;
  icerik: string;
  slug: string;
  platform: string;
}

export interface CreateCampaignInput {
  userId: string;
  sehir: string;
  sektor: string;
  markaAdi: string;
  skor: number;
  gunlukButce: number;
  gunSayisi: number;
  agresiflik: string;
  makaleSayisi: number;
  radarSikligi: string;
  radarSikligiDakika: number;
  baits: CampaignBaitInput[];
}

export interface CreatedCampaignResult {
  id: string;
  baits: Array<{
    id: string;
    baslik: string;
    icerik: string;
    slug: string;
  }>;
}

async function createCampaignViaPrisma(
  input: CreateCampaignInput,
): Promise<CreatedCampaignResult> {
  const created = await prisma.campaign.create({
    data: {
      userId: input.userId,
      sehir: input.sehir,
      sektor: input.sektor,
      markaAdi: input.markaAdi,
      skor: input.skor,
      gunlukButce: input.gunlukButce,
      gunSayisi: input.gunSayisi,
      agresiflik: input.agresiflik,
      makaleSayisi: input.makaleSayisi,
      radarSikligi: input.radarSikligi,
      radarSikligiDakika: input.radarSikligiDakika,
      baits: {
        create: input.baits,
      },
    },
    include: { baits: true },
  });

  return {
    id: created.id,
    baits: created.baits.map((bait) => ({
      id: bait.id,
      baslik: bait.baslik,
      icerik: bait.icerik,
      slug: bait.slug,
    })),
  };
}

async function createCampaignViaSupabase(
  input: CreateCampaignInput,
): Promise<CreatedCampaignResult> {
  const supabase = getSupabaseAdmin();
  const campaignId = crypto.randomUUID();

  const { error: campaignError } = await supabase.from("Campaign").insert({
    id: campaignId,
    userId: input.userId,
    sehir: input.sehir,
    sektor: input.sektor,
    markaAdi: input.markaAdi,
    skor: input.skor,
    gunlukButce: input.gunlukButce,
    gunSayisi: input.gunSayisi,
    agresiflik: input.agresiflik,
    makaleSayisi: input.makaleSayisi,
    radarSikligi: input.radarSikligi,
    radarSikligiDakika: input.radarSikligiDakika,
  });

  if (campaignError) {
    throw campaignError;
  }

  const baitRows = input.baits.map((bait) => ({
    id: crypto.randomUUID(),
    campaignId,
    baslik: bait.baslik,
    icerik: bait.icerik,
    slug: bait.slug,
    platform: bait.platform,
    status: "published",
    yayinlandi: true,
  }));

  const { data: createdBaits, error: baitError } = await supabase
    .from("Bait")
    .insert(baitRows)
    .select("id, baslik, icerik, slug");

  if (baitError) {
    throw baitError;
  }

  return {
    id: campaignId,
    baits: (createdBaits ?? []).map((bait) => ({
      id: bait.id,
      baslik: bait.baslik,
      icerik: bait.icerik,
      slug: bait.slug,
    })),
  };
}

export async function createCampaignWithBaits(
  input: CreateCampaignInput,
): Promise<CreatedCampaignResult> {
  if (hasDatabaseUrl()) {
    try {
      return await createCampaignViaPrisma(input);
    } catch (error) {
      console.error("API Hatası:", error);
    }
  }

  return createCampaignViaSupabase(input);
}

export async function updateRadarCampaignState(
  campaignId: string,
  data: {
    isOptimized: boolean;
    llmFeedback: string;
    lastCheckedAt: Date;
  },
): Promise<void> {
  if (hasDatabaseUrl()) {
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data,
      });
      return;
    } catch (error) {
      console.error("API Hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("Campaign")
    .update({
      isOptimized: data.isOptimized,
      llmFeedback: data.llmFeedback,
      lastCheckedAt: data.lastCheckedAt.toISOString(),
    })
    .eq("id", campaignId);

  if (error) {
    throw error;
  }
}
