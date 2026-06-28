import "server-only";

import type { StoredBait, StoredCampaign } from "@/types/campaign";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl, hasSupabaseAdminEnv } from "@/lib/server-env";
import { buildHubArticleUrl } from "@/lib/hub-url";

type SupabaseBaitRow = {
  id: string;
  user_id: string;
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
  wordpress_url: string | null;
  createdAt: string;
  Bait?: SupabaseBaitRow[] | null;
};

function mapBait(row: SupabaseBaitRow): StoredBait {
  const status = normalizeBaitStatus(row.status);
  return {
    id: row.id,
    userId: row.user_id,
    campaignId: row.campaignId,
    baslik: row.baslik,
    icerik: row.icerik,
    slug: row.slug,
    platform: row.platform,
    yayinlandi: row.yayinlandi || isPublishedStatus(status),
    status,
    liveUrl: row.live_url ?? null,
    externalLiveUrl: row.external_live_url ?? null,
    createdAt: row.createdAt,
  };
}

function normalizeBaitStatus(status: string | null | undefined): string {
  const value = status?.trim().toUpperCase();
  if (!value) {
    return "PENDING";
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
        bait.yayinlandi || isPublishedStatus(normalizeBaitStatus(bait.status)),
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
    wordpressUrl: row.wordpress_url ?? null,
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
      wordpressUrl: campaign.wordpressUrl,
      baits: campaign.baits.map((bait) => ({
        ...bait,
        userId: bait.userId,
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
/** Eşzamanlı çift POST koruması — tamamlanmış kampanyalar için kısa pencere. */
const CONCURRENT_CAMPAIGN_WINDOW_MS = 5_000;
const INCOMPLETE_SHELL_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CAMPAIGN_PROCESSING_MARKER = "__NEXIS_PROCESSING__";
const CAMPAIGN_PROCESSING_STALE_MS = 15 * 60 * 1000;

function normalizeCampaignText(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function campaignTextsMatch(stored: string, incoming: string): boolean {
  return normalizeCampaignText(stored) === normalizeCampaignText(incoming);
}

function buildCampaignShellRecord(input: CampaignShellInput, campaignId: string) {
  return {
    id: campaignId,
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
}

async function insertCampaignShellWithFallback(
  input: CampaignShellInput,
  campaignId: string,
): Promise<boolean> {
  const shell = buildCampaignShellRecord(input, campaignId);
  const { id, ...data } = shell;

  if (hasDatabaseUrl()) {
    try {
      await prisma.campaign.create({ data: { id, ...data } });
      return true;
    } catch (error) {
      console.error("[CAMPAIGN_CLAIM]: Prisma shell oluşturulamadı:", error);
    }
  }

  if (hasSupabaseAdminEnv()) {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("Campaign").insert(shell);
      if (!error) {
        return true;
      }
      console.error("[CAMPAIGN_CLAIM]: Supabase shell oluşturulamadı:", error);
    } catch (error) {
      console.error("[CAMPAIGN_CLAIM]: Supabase insert hatası:", error);
    }
  }

  return false;
}

async function resolveExistingCampaignSlot(
  input: CampaignShellInput,
): Promise<string | null> {
  const withoutBaits = await findCampaignWithoutBaits(
    input.userId,
    input.markaAdi,
    input.sehir,
  );
  if (withoutBaits) {
    return withoutBaits;
  }

  return findLatestMatchingCampaignId(
    input.userId,
    input.markaAdi,
    input.sehir,
    INCOMPLETE_SHELL_MAX_AGE_MS,
  );
}

async function clearStaleProcessingLock(campaignId: string): Promise<void> {
  if (hasDatabaseUrl()) {
    try {
      await prisma.campaign.updateMany({
        where: {
          id: campaignId,
          llmFeedback: { startsWith: CAMPAIGN_PROCESSING_MARKER },
        },
        data: { llmFeedback: "Yapay zeka taraması bekleniyor..." },
      });
    } catch (error) {
      console.error("[CAMPAIGN_LOCK]: Stale kilit temizlenemedi:", error);
    }
  }
}

async function finalizeCampaignSlotClaim(
  input: CampaignShellInput,
  campaignId: string,
): Promise<string> {
  const recent = await findRecentMatchingCampaigns(
    input.userId,
    input.markaAdi,
    input.sehir,
    CONCURRENT_CAMPAIGN_WINDOW_MS,
  );

  if (recent.length === 0) {
    return campaignId;
  }

  const winner = recent[0];
  if (winner.id !== campaignId) {
    await deleteCampaignById(campaignId);
    return winner.id;
  }

  for (const duplicate of recent.slice(1)) {
    await deleteCampaignById(duplicate.id);
  }

  return campaignId;
}

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

async function findCampaignWithoutBaits(
  userId: string,
  markaAdi: string,
  sehir: string,
  maxAgeMs = INCOMPLETE_SHELL_MAX_AGE_MS,
): Promise<string | null> {
  const since = new Date(Date.now() - maxAgeMs);

  if (hasDatabaseUrl()) {
    try {
      const rows = await prisma.campaign.findMany({
        where: {
          userId,
          createdAt: { gte: since },
        },
        select: {
          id: true,
          markaAdi: true,
          sehir: true,
          _count: { select: { baits: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      const match = rows.find(
        (row) =>
          campaignTextsMatch(row.markaAdi, markaAdi) &&
          campaignTextsMatch(row.sehir, sehir) &&
          row._count.baits === 0,
      );
      if (match) {
        return match.id;
      }
    } catch (error) {
      console.error("[CAMPAIGN_SHELL]: Prisma sorgusu başarısız:", error);
    }
  }

  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Campaign")
    .select("id, markaAdi, sehir, createdAt")
    .eq("userId", userId)
    .gte("createdAt", since.toISOString())
    .order("createdAt", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[CAMPAIGN_SHELL]: Supabase sorgusu başarısız:", error);
    return null;
  }

  for (const row of data ?? []) {
    if (
      !campaignTextsMatch(row.markaAdi ?? "", markaAdi) ||
      !campaignTextsMatch(row.sehir ?? "", sehir)
    ) {
      continue;
    }

    const baitCount = await getCampaignBaitCount(row.id as string);
    if (baitCount === 0) {
      return row.id as string;
    }
  }

  return null;
}

async function findLatestMatchingCampaignId(
  userId: string,
  markaAdi: string,
  sehir: string,
  windowMs = DUPLICATE_CAMPAIGN_WINDOW_MS,
): Promise<string | null> {
  const recent = await findRecentMatchingCampaigns(
    userId,
    markaAdi,
    sehir,
    windowMs,
  );
  return recent.length > 0 ? recent[recent.length - 1].id : null;
}

async function refreshCampaignShell(
  campaignId: string,
  input: CampaignShellInput,
): Promise<void> {
  const data = {
    sektor: input.sektor.trim(),
    markaAdi: input.markaAdi.trim(),
    gunlukButce: input.gunlukButce,
    gunSayisi: input.gunSayisi,
    agresiflik: input.agresiflik,
    radarSikligi: input.radarSikligi,
    radarSikligiDakika: input.radarSikligiDakika,
  };

  if (hasDatabaseUrl()) {
    try {
      await prisma.campaign.update({ where: { id: campaignId }, data });
      return;
    } catch (error) {
      console.error("[CAMPAIGN_SHELL]: Prisma güncelleme hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("Campaign")
    .update(data)
    .eq("id", campaignId);

  if (error) {
    console.error("[CAMPAIGN_SHELL]: Supabase güncelleme hatası:", error);
  }
}

async function findRecentMatchingCampaigns(
  userId: string,
  markaAdi: string,
  sehir: string,
  windowMs = DUPLICATE_CAMPAIGN_WINDOW_MS,
): Promise<Array<{ id: string; createdAt: Date }>> {
  const since = new Date(Date.now() - windowMs);

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
            campaignTextsMatch(row.markaAdi, markaAdi) &&
            campaignTextsMatch(row.sehir, sehir),
        )
        .map((row) => ({ id: row.id, createdAt: row.createdAt }));
    } catch (error) {
      console.error("[CAMPAIGN_RACE]: Prisma sorgusu başarısız:", error);
    }
  }

  if (!hasSupabaseAdminEnv()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Campaign")
    .select("id, markaAdi, sehir, createdAt")
    .eq("userId", userId)
    .gte("createdAt", since.toISOString())
    .order("createdAt", { ascending: true });

  if (error) {
    console.error("[CAMPAIGN_RACE]: Supabase sorgusu başarısız:", error);
    return [];
  }

  return (data ?? [])
    .filter(
      (row) =>
        campaignTextsMatch(row.markaAdi ?? "", markaAdi) &&
        campaignTextsMatch(row.sehir ?? "", sehir),
    )
    .map((row) => ({
      id: row.id as string,
      createdAt: new Date(row.createdAt as string),
    }));
}

/** Eşzamanlı isteklerde yarışı çözer; kazanan kampanya ID'sini döner. */
export async function claimAutonomousCampaignSlot(
  input: CampaignShellInput,
): Promise<string> {
  const existingId = await resolveExistingCampaignSlot(input);
  if (existingId) {
    await refreshCampaignShell(existingId, input);
    await clearStaleProcessingLock(existingId);
    return existingId;
  }

  const campaignId = crypto.randomUUID();
  const inserted = await insertCampaignShellWithFallback(input, campaignId);

  if (!inserted) {
    const racedId = await resolveExistingCampaignSlot(input);
    if (racedId) {
      await refreshCampaignShell(racedId, input);
      await clearStaleProcessingLock(racedId);
      return racedId;
    }

    const retryId = crypto.randomUUID();
    const retryInserted = await insertCampaignShellWithFallback(input, retryId);
    if (!retryInserted) {
      const finalId = await resolveExistingCampaignSlot(input);
      if (finalId) {
        await refreshCampaignShell(finalId, input);
        await clearStaleProcessingLock(finalId);
        return finalId;
      }

      throw new Error("Kampanya kaydı oluşturulamadı.");
    }

    return finalizeCampaignSlotClaim(input, retryId);
  }

  return finalizeCampaignSlotClaim(input, campaignId);
}

export async function getCampaignOwnerUserId(
  campaignId: string,
): Promise<string | null> {
  if (hasDatabaseUrl()) {
    try {
      const row = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { userId: true },
      });

      if (row?.userId) {
        return row.userId;
      }
    } catch (error) {
      console.error("[CAMPAIGN_OWNER]: Prisma sahip sorgusu başarısız:", error);
    }
  }

  if (hasSupabaseAdminEnv()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("Campaign")
        .select("userId")
        .eq("id", campaignId)
        .maybeSingle();

      if (!error && data?.userId) {
        return data.userId as string;
      }
    } catch (error) {
      console.error("[CAMPAIGN_OWNER]: Supabase sahip sorgusu başarısız:", error);
    }
  }

  return null;
}

export async function userHasCampaignAccess(
  campaignId: string,
  userId: string,
): Promise<boolean> {
  const ownerId = await getCampaignOwnerUserId(campaignId);
  if (ownerId && ownerId === userId) {
    return true;
  }

  if (!hasDatabaseUrl()) {
    return false;
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        campaignId,
        userId,
        providerStatusCode: "WALLET_DEBIT",
        status: { in: ["success", "succeeded", "paid"] },
      },
      select: { id: true },
    });

    return Boolean(payment);
  } catch (error) {
    console.error("[CAMPAIGN_ACCESS]: Ödeme tabanlı erişim sorgusu başarısız:", error);
    return false;
  }
}

export async function getCampaignBaitCount(
  campaignId: string,
  userId?: string,
): Promise<number> {
  if (hasDatabaseUrl()) {
    try {
      return await prisma.bait.count({
        where: {
          campaignId,
          ...(userId ? { userId } : {}),
        },
      });
    } catch (error) {
      console.error("[CAMPAIGN_BAITS]: Prisma sayım hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("Bait")
    .select("*", { count: "exact", head: true })
    .eq("campaignId", campaignId);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[CAMPAIGN_BAITS]: Supabase sayım hatası:", error);
    return 0;
  }

  return count ?? 0;
}

/** Arka plan işi kilidi serbest bıraktıysa (llmFeedback güncellendiyse) true döner. */
export async function isCampaignBackgroundJobFinished(
  campaignId: string,
): Promise<boolean> {
  if (!hasDatabaseUrl()) {
    return false;
  }

  try {
    const row = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { llmFeedback: true },
    });
    const feedback = row?.llmFeedback?.trim() ?? "";
    if (!feedback || feedback.startsWith(CAMPAIGN_PROCESSING_MARKER)) {
      return false;
    }

    return (await getCampaignBaitCount(campaignId)) > 0;
  } catch (error) {
    console.error("[CAMPAIGN_BAITS]: Arka plan tamamlanma kontrolü hatası:", error);
    return false;
  }
}

export async function resolveRecentDuplicateCampaignId(
  userId: string,
  markaAdi: string,
  sehir: string,
): Promise<string | null> {
  const withoutBaits = await findCampaignWithoutBaits(userId, markaAdi, sehir);
  if (withoutBaits) {
    return withoutBaits;
  }

  return findLatestMatchingCampaignId(
    userId,
    markaAdi,
    sehir,
    DUPLICATE_CAMPAIGN_WINDOW_MS,
  );
}

export type CampaignExecutionState = "acquired" | "complete" | "in_progress";

export async function tryAcquireCampaignExecution(
  campaignId: string,
): Promise<CampaignExecutionState> {
  const baitCount = await getCampaignBaitCount(campaignId);
  if (baitCount > 0) {
    return "complete";
  }

  if (hasDatabaseUrl()) {
    try {
      const row = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { llmFeedback: true },
      });

      const feedback = row?.llmFeedback ?? null;
      if (
        typeof feedback === "string" &&
        feedback.startsWith(CAMPAIGN_PROCESSING_MARKER)
      ) {
        const startedAt = Number(
          feedback.slice(CAMPAIGN_PROCESSING_MARKER.length + 1),
        );
        if (
          Number.isFinite(startedAt) &&
          Date.now() - startedAt < CAMPAIGN_PROCESSING_STALE_MS
        ) {
          return "in_progress";
        }
      }

      const updated = await prisma.campaign.updateMany({
        where: {
          id: campaignId,
          llmFeedback: feedback,
        },
        data: { llmFeedback: `${CAMPAIGN_PROCESSING_MARKER}:${Date.now()}` },
      });

      if (updated.count === 1) {
        return "acquired";
      }

      const baitCountAfter = await getCampaignBaitCount(campaignId);
      return baitCountAfter > 0 ? "complete" : "in_progress";
    } catch (error) {
      console.error("[CAMPAIGN_LOCK]: Prisma kilidi alınamadı:", error);
      return "in_progress";
    }
  }

  return "acquired";
}

export async function releaseCampaignProcessingLock(
  campaignId: string,
  feedback = "Yapay zeka taraması bekleniyor...",
): Promise<void> {
  if (!hasDatabaseUrl()) {
    return;
  }

  try {
    await prisma.campaign.updateMany({
      where: {
        id: campaignId,
        llmFeedback: { startsWith: CAMPAIGN_PROCESSING_MARKER },
      },
      data: { llmFeedback: feedback },
    });
  } catch (error) {
    console.error("[CAMPAIGN_LOCK]: İşlem kilidi serbest bırakılamadı:", error);
  }
}

export async function completeCampaignWithBaits(
  campaignId: string,
  input: Omit<CreateCampaignInput, "userId">,
  ownerUserId: string,
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
              userId: ownerUserId,
              ...buildPublishedBaitFields(bait.slug),
            })),
          },
        },
      });

      const baits = await prisma.bait.findMany({
        where: { campaignId, userId: ownerUserId },
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
    user_id: ownerUserId,
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

async function listRadarCampaignsViaPrisma(
  userId?: string,
): Promise<RadarCampaignRecord[]> {
  const campaigns = await prisma.campaign.findMany({
    where: userId ? { userId } : undefined,
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

async function listRadarCampaignsViaSupabase(
  userId?: string,
): Promise<RadarCampaignRecord[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("Campaign")
    .select(
      "id, markaAdi, sehir, sektor, radarSikligiDakika, lastCheckedAt, createdAt, isOptimized, llmFeedback",
    )
    .order("createdAt", { ascending: false });

  if (userId) {
    query = query.eq("userId", userId);
  }

  const { data, error } = await query;

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

export async function listRadarCampaigns(
  userId?: string,
): Promise<RadarCampaignRecord[]> {
  if (hasDatabaseUrl()) {
    try {
      return await listRadarCampaignsViaPrisma(userId);
    } catch (error) {
      console.error("API Hatası:", error);
    }
  }

  return listRadarCampaignsViaSupabase(userId);
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
  businessDomain?: string | null;
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
      businessDomain: input.businessDomain ?? null,
      baits: {
        create: input.baits.map((bait) => ({
          ...bait,
          userId: input.userId,
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
    user_id: input.userId,
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
