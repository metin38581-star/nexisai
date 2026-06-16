import "server-only";

import type { StoredBait, StoredCampaign } from "@/types/campaign";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";
import { buildHubArticleUrl } from "@/lib/hub-url";

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
  const status = normalizeBaitStatus(row.status);
  return {
    id: row.id,
    campaignId: row.campaignId,
    baslik: row.baslik,
    icerik: row.icerik,
    slug: row.slug,
    platform: row.platform,
    yayinlandi: row.yayinlandi || isPublishedStatus(status) || Boolean(row.slug?.trim()),
    status,
    liveUrl: row.live_url ?? null,
    externalLiveUrl: row.external_live_url ?? null,
    createdAt: row.createdAt,
  };
}

function normalizeBaitStatus(status: string | null | undefined): string {
  const value = status?.trim().toUpperCase();
  if (!value || value === "PENDING" || value === "FAILED") {
    return "PUBLISHED";
  }
  return value;
}

function isPublishedStatus(status: string): boolean {
  return ["PUBLISHED", "SUCCESS", "published"].includes(status);
}

function mapPrismaCampaigns(
  campaigns: Array<{ baits: StoredBait[] } & Omit<StoredCampaign, "baits">>,
): StoredCampaign[] {
  return campaigns.map((campaign) => ({
    ...campaign,
    baits: (campaign.baits ?? []).map((bait) => ({
      ...bait,
      status: normalizeBaitStatus(bait.status),
      yayinlandi:
        bait.yayinlandi ||
        isPublishedStatus(normalizeBaitStatus(bait.status)) ||
        Boolean(bait.slug?.trim()),
    })),
  }));
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

  return mapPrismaCampaigns(
    campaigns.map((campaign) => ({
      ...campaign,
      createdAt: campaign.createdAt.toISOString(),
      lastCheckedAt: campaign.lastCheckedAt?.toISOString() ?? null,
      liveUrl: campaign.liveUrl,
      externalLiveUrl: campaign.externalLiveUrl,
      baits: campaign.baits.map((bait) => ({
        ...bait,
        createdAt: bait.createdAt.toISOString(),
      })),
    })),
  );
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

const DUPLICATE_CAMPAIGN_WINDOW_MS = 60_000;

/** Son 1 dakikada aynı marka + şehir için kampanya var mı? */
export async function hasRecentDuplicateCampaign(
  userId: string,
  markaAdi: string,
  sehir: string,
  windowMs = DUPLICATE_CAMPAIGN_WINDOW_MS,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const normalizedBrand = markaAdi.trim().toLowerCase();
  const normalizedCity = sehir.trim().toLowerCase();

  if (hasDatabaseUrl()) {
    try {
      const recent = await prisma.campaign.findFirst({
        where: {
          userId,
          createdAt: { gte: since },
          markaAdi: { equals: markaAdi.trim(), mode: "insensitive" },
          sehir: { equals: sehir.trim(), mode: "insensitive" },
        },
        select: { id: true },
      });
      return recent !== null;
    } catch (error) {
      console.error("[DUPLICATE_CHECK]: Prisma sorgusu başarısız:", error);
    }
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("Campaign")
      .select("id, markaAdi, sehir, createdAt")
      .eq("userId", userId)
      .gte("createdAt", since.toISOString())
      .order("createdAt", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return (data ?? []).some(
      (row) =>
        row.markaAdi?.trim().toLowerCase() === normalizedBrand &&
        row.sehir?.trim().toLowerCase() === normalizedCity,
    );
  } catch (error) {
    console.error("[DUPLICATE_CHECK]: Supabase sorgusu başarısız:", error);
    return false;
  }
}

function buildPublishedBaitFields(slug: string) {
  const hubUrl = buildHubArticleUrl(slug);
  return {
    yayinlandi: true,
    status: "PUBLISHED",
    liveUrl: hubUrl,
  };
}

function buildPublishedBaitFieldsSupabase(slug: string) {
  const hubUrl = buildHubArticleUrl(slug);
  return {
    yayinlandi: true,
    status: "PUBLISHED",
    live_url: hubUrl,
  };
}

export interface CampaignShellInput {
  userId: string;
  sehir: string;
  sektor: string;
  markaAdi: string;
  gunlukButce: number;
  gunSayisi: number;
  agresiflik: string;
  radarSikligi: string;
  radarSikligiDakika: number;
  skor?: number;
}

async function deleteCampaignById(campaignId: string): Promise<void> {
  if (hasDatabaseUrl()) {
    try {
      await prisma.campaign.delete({ where: { id: campaignId } });
      return;
    } catch (error) {
      console.error("[CAMPAIGN_DELETE]: Prisma silme hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  await supabase.from("Bait").delete().eq("campaignId", campaignId);
  await supabase.from("Campaign").delete().eq("id", campaignId);
}

async function findRecentMatchingCampaigns(
  userId: string,
  markaAdi: string,
  sehir: string,
  windowMs = DUPLICATE_CAMPAIGN_WINDOW_MS,
): Promise<Array<{ id: string; createdAt: Date }>> {
  const since = new Date(Date.now() - windowMs);
  const normalizedBrand = markaAdi.trim().toLowerCase();
  const normalizedCity = sehir.trim().toLowerCase();

  if (hasDatabaseUrl()) {
    try {
      const rows = await prisma.campaign.findMany({
        where: {
          userId,
          createdAt: { gte: since },
        },
        select: { id: true, markaAdi: true, sehir: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      return rows
        .filter(
          (row) =>
            row.markaAdi.trim().toLowerCase() === normalizedBrand &&
            row.sehir.trim().toLowerCase() === normalizedCity,
        )
        .map((row) => ({ id: row.id, createdAt: row.createdAt }));
    } catch (error) {
      console.error("[CAMPAIGN_RACE]: Prisma sorgusu başarısız:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Campaign")
    .select("id, markaAdi, sehir, createdAt")
    .eq("userId", userId)
    .gte("createdAt", since.toISOString())
    .order("createdAt", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter(
      (row) =>
        row.markaAdi?.trim().toLowerCase() === normalizedBrand &&
        row.sehir?.trim().toLowerCase() === normalizedCity,
    )
    .map((row) => ({
      id: row.id as string,
      createdAt: new Date(row.createdAt as string),
    }));
}

/** Eşzamanlı isteklerde yarışı çözer; kazanan kampanya ID'sini döner. */
export async function claimAutonomousCampaignSlot(
  input: CampaignShellInput,
): Promise<string | null> {
  const existingBefore = await findRecentMatchingCampaigns(
    input.userId,
    input.markaAdi,
    input.sehir,
  );

  if (existingBefore.length > 0) {
    return null;
  }

  const campaignId = crypto.randomUUID();
  const shell = {
    userId: input.userId,
    sehir: input.sehir.trim(),
    sektor: input.sektor.trim(),
    markaAdi: input.markaAdi.trim(),
    skor: input.skor ?? 0,
    gunlukButce: input.gunlukButce,
    gunSayisi: input.gunSayisi,
    agresiflik: input.agresiflik,
    makaleSayisi: 0,
    radarSikligi: input.radarSikligi,
    radarSikligiDakika: input.radarSikligiDakika,
  };

  if (hasDatabaseUrl()) {
    try {
      await prisma.campaign.create({
        data: { id: campaignId, ...shell },
      });
    } catch (error) {
      console.error("[CAMPAIGN_CLAIM]: Prisma shell oluşturulamadı:", error);
      return null;
    }
  } else {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("Campaign").insert({
      id: campaignId,
      ...shell,
    });
    if (error) {
      console.error("[CAMPAIGN_CLAIM]: Supabase shell oluşturulamadı:", error);
      return null;
    }
  }

  const recent = await findRecentMatchingCampaigns(
    input.userId,
    input.markaAdi,
    input.sehir,
  );

  if (recent.length === 0) {
    return campaignId;
  }

  const winner = recent[0];

  if (winner.id !== campaignId) {
    await deleteCampaignById(campaignId);
    return null;
  }

  for (const duplicate of recent.slice(1)) {
    await deleteCampaignById(duplicate.id);
  }

  return campaignId;
}

export async function completeCampaignWithBaits(
  campaignId: string,
  input: Omit<CreateCampaignInput, "userId">,
): Promise<CreatedCampaignResult> {
  if (hasDatabaseUrl()) {
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
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
            create: input.baits.map((bait) => ({
              ...bait,
              ...buildPublishedBaitFields(bait.slug),
            })),
          },
        },
      });

      const baits = await prisma.bait.findMany({
        where: { campaignId },
        select: { id: true, baslik: true, icerik: true, slug: true },
      });

      return {
        id: campaignId,
        baits,
      };
    } catch (error) {
      console.error("[CAMPAIGN_COMPLETE]: Prisma tamamlama hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  const { error: campaignError } = await supabase
    .from("Campaign")
    .update({
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
    })
    .eq("id", campaignId);

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
    ...buildPublishedBaitFieldsSupabase(bait.slug),
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
        create: input.baits.map((bait) => ({
          ...bait,
          ...buildPublishedBaitFields(bait.slug),
        })),
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
    ...buildPublishedBaitFieldsSupabase(bait.slug),
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
