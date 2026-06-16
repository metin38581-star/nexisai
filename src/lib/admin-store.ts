import "server-only";

import type {
  AdminBusinessDetail,
  AdminBusinessRow,
  AdminCampaignHistory,
  AdminIntentContentPair,
  AdminPaymentRecord,
} from "@/types/admin";
import { SECTOR_OPTIONS } from "@/lib/constants";
import { buildHubArticleUrl } from "@/lib/hub-url";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";
import {
  listPaymentsByUserId,
  sumSuccessfulPaymentsAllUsers,
  sumSuccessfulPaymentsByUserId,
} from "@/lib/payment-store";

interface AuthUserSummary {
  id: string;
  email: string;
  createdAt: string;
  companyName: string | null;
}

interface CampaignAggregate {
  userId: string;
  markaAdi: string;
  sektor: string;
  count: number;
  latestCreatedAt: Date;
}

function resolveSectorLabel(sektor: string): string {
  return SECTOR_OPTIONS.find((option) => option.value === sektor)?.label ?? sektor;
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "TRY" || currency === "₺" ? "₺" : "$";
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

async function listAuthUsers(): Promise<AuthUserSummary[]> {
  const supabase = getSupabaseAdmin();
  const users: AuthUserSummary[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    for (const user of data.users) {
      const metadata = user.user_metadata ?? {};
      const companyName =
        (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
        (typeof metadata.company_name === "string" &&
          metadata.company_name.trim()) ||
        (typeof metadata.name === "string" && metadata.name.trim()) ||
        null;

      users.push({
        id: user.id,
        email: user.email ?? "—",
        createdAt: user.created_at,
        companyName,
      });
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function listCampaignAggregatesViaPrisma(): Promise<CampaignAggregate[]> {
  const campaigns = await prisma.campaign.findMany({
    where: { userId: { not: null } },
    select: {
      userId: true,
      markaAdi: true,
      sektor: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<string, CampaignAggregate>();

  for (const campaign of campaigns) {
    if (!campaign.userId) {
      continue;
    }

    const existing = map.get(campaign.userId);
    if (!existing) {
      map.set(campaign.userId, {
        userId: campaign.userId,
        markaAdi: campaign.markaAdi,
        sektor: campaign.sektor,
        count: 1,
        latestCreatedAt: campaign.createdAt,
      });
      continue;
    }

    existing.count += 1;
  }

  return Array.from(map.values());
}

async function listCampaignAggregatesViaSupabase(): Promise<CampaignAggregate[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Campaign")
    .select("userId, markaAdi, sektor, createdAt")
    .not("userId", "is", null)
    .order("createdAt", { ascending: false });

  if (error) {
    throw error;
  }

  const map = new Map<string, CampaignAggregate>();

  for (const campaign of data ?? []) {
    const userId = campaign.userId as string | null;
    if (!userId) {
      continue;
    }

    const existing = map.get(userId);
    if (!existing) {
      map.set(userId, {
        userId,
        markaAdi: campaign.markaAdi as string,
        sektor: campaign.sektor as string,
        count: 1,
        latestCreatedAt: new Date(campaign.createdAt as string),
      });
      continue;
    }

    existing.count += 1;
  }

  return Array.from(map.values());
}

async function listCampaignAggregates(): Promise<CampaignAggregate[]> {
  if (hasDatabaseUrl()) {
    try {
      return await listCampaignAggregatesViaPrisma();
    } catch (error) {
      console.error("[ADMIN_STORE]: Prisma kampanya özeti hatası:", error);
    }
  }

  return listCampaignAggregatesViaSupabase();
}

function buildBusinessRow(
  user: AuthUserSummary,
  aggregate: CampaignAggregate | undefined,
  paymentTotal: number,
): AdminBusinessRow {
  const companyName = aggregate?.markaAdi ?? user.companyName ?? "—";
  const sector = aggregate?.sektor ?? "—";
  const currency = "USD";

  return {
    userId: user.id,
    registeredAt: user.createdAt,
    companyName,
    sector,
    sectorLabel: sector === "—" ? "—" : resolveSectorLabel(sector),
    email: user.email,
    totalPaymentAmount: paymentTotal,
    currency,
    campaignCount: aggregate?.count ?? 0,
  };
}

export async function listAdminBusinesses(): Promise<AdminBusinessRow[]> {
  const [authUsers, aggregates, paymentTotals] = await Promise.all([
    listAuthUsers(),
    listCampaignAggregates(),
    sumSuccessfulPaymentsAllUsers(),
  ]);

  const aggregateByUser = new Map(aggregates.map((row) => [row.userId, row]));
  const userIdsFromAuth = new Set(authUsers.map((user) => user.id));

  const rows = authUsers.map((user) =>
    buildBusinessRow(
      user,
      aggregateByUser.get(user.id),
      paymentTotals.get(user.id) ?? 0,
    ),
  );

  for (const aggregate of aggregates) {
    if (userIdsFromAuth.has(aggregate.userId)) {
      continue;
    }

    rows.push({
      userId: aggregate.userId,
      registeredAt: aggregate.latestCreatedAt.toISOString(),
      companyName: aggregate.markaAdi,
      sector: aggregate.sektor,
      sectorLabel: resolveSectorLabel(aggregate.sektor),
      email: "—",
      totalPaymentAmount: paymentTotals.get(aggregate.userId) ?? 0,
      currency: "USD",
      campaignCount: aggregate.count,
    });
  }

  return rows.sort(
    (a, b) =>
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
  );
}

type CampaignWithRelations = {
  id: string;
  markaAdi: string;
  sehir: string;
  sektor: string;
  gunlukButce: number;
  gunSayisi: number;
  skor: number;
  agresiflik: string;
  makaleSayisi: number;
  createdAt: Date;
  baits: Array<{
    id: string;
    baslik: string;
    slug: string;
    createdAt: Date;
    liveUrl: string | null;
    externalLiveUrl: string | null;
  }>;
  intents: Array<{
    id: string;
    question: string;
    simulatedAnswer: string;
    sortOrder: number;
    baitId: string | null;
    bait: {
      id: string;
      baslik: string;
      slug: string;
      createdAt: Date;
      liveUrl: string | null;
      externalLiveUrl: string | null;
    } | null;
  }>;
};

async function getCampaignsForUserViaPrisma(
  userId: string,
): Promise<CampaignWithRelations[]> {
  return prisma.campaign.findMany({
    where: { userId },
    include: {
      baits: {
        orderBy: { createdAt: "asc" },
      },
      intents: {
        orderBy: { sortOrder: "asc" },
        include: { bait: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getCampaignsForUserViaSupabase(
  userId: string,
): Promise<CampaignWithRelations[]> {
  const supabase = getSupabaseAdmin();
  const { data: campaigns, error } = await supabase
    .from("Campaign")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false });

  if (error) {
    throw error;
  }

  const results: CampaignWithRelations[] = [];

  for (const campaign of campaigns ?? []) {
    const campaignId = campaign.id as string;

    const [{ data: baits }, { data: intents }] = await Promise.all([
      supabase
        .from("Bait")
        .select("*")
        .eq("campaignId", campaignId)
        .order("createdAt", { ascending: true }),
      supabase
        .from("CampaignIntent")
        .select("*")
        .eq("campaignId", campaignId)
        .order("sortOrder", { ascending: true }),
    ]);

    const baitMap = new Map(
      (baits ?? []).map((bait) => [bait.id as string, bait]),
    );

    results.push({
      id: campaignId,
      markaAdi: campaign.markaAdi as string,
      sehir: campaign.sehir as string,
      sektor: campaign.sektor as string,
      gunlukButce: Number(campaign.gunlukButce),
      gunSayisi: Number(campaign.gunSayisi),
      skor: Number(campaign.skor),
      agresiflik: campaign.agresiflik as string,
      makaleSayisi: Number(campaign.makaleSayisi),
      createdAt: new Date(campaign.createdAt as string),
      baits: (baits ?? []).map((bait) => ({
        id: bait.id as string,
        baslik: bait.baslik as string,
        slug: bait.slug as string,
        createdAt: new Date(bait.createdAt as string),
        liveUrl: (bait.live_url as string | null) ?? null,
        externalLiveUrl: (bait.external_live_url as string | null) ?? null,
      })),
      intents: (intents ?? []).map((intent) => {
        const baitId = intent.baitId as string | null;
        const baitRow = baitId ? baitMap.get(baitId) : undefined;

        return {
          id: intent.id as string,
          question: intent.question as string,
          simulatedAnswer: intent.simulatedAnswer as string,
          sortOrder: Number(intent.sortOrder),
          baitId,
          bait: baitRow
            ? {
                id: baitRow.id as string,
                baslik: baitRow.baslik as string,
                slug: baitRow.slug as string,
                createdAt: new Date(baitRow.createdAt as string),
                liveUrl: (baitRow.live_url as string | null) ?? null,
                externalLiveUrl:
                  (baitRow.external_live_url as string | null) ?? null,
              }
            : null,
        };
      }),
    });
  }

  return results;
}

function mapBaitPublication(
  bait: CampaignWithRelations["baits"][number],
): AdminIntentContentPair["bait"] {
  return {
    id: bait.id,
    baslik: bait.baslik,
    slug: bait.slug,
    createdAt: bait.createdAt.toISOString(),
    liveUrl: bait.liveUrl,
    externalLiveUrl: bait.externalLiveUrl,
    hubUrl: buildHubArticleUrl(bait.slug),
  };
}

function buildIntentContentPairs(
  campaign: CampaignWithRelations,
): AdminIntentContentPair[] {
  if (campaign.intents.length > 0) {
    return campaign.intents.map((intent) => ({
      intentId: intent.id,
      question: intent.question,
      simulatedAnswer: intent.simulatedAnswer,
      sortOrder: intent.sortOrder,
      bait: intent.bait ? mapBaitPublication(intent.bait) : null,
    }));
  }

  return campaign.baits.map((bait, index) => ({
    intentId: null,
    question: "Arşivlenmemiş hedef (eski kampanya)",
    simulatedAnswer: "",
    sortOrder: index,
    bait: mapBaitPublication(bait),
  }));
}

function mapCampaignHistory(campaign: CampaignWithRelations): AdminCampaignHistory {
  return {
    id: campaign.id,
    markaAdi: campaign.markaAdi,
    sehir: campaign.sehir,
    sektor: campaign.sektor,
    sectorLabel: resolveSectorLabel(campaign.sektor),
    gunlukButce: campaign.gunlukButce,
    gunSayisi: campaign.gunSayisi,
    totalCost: campaign.gunlukButce * campaign.gunSayisi,
    skor: campaign.skor,
    agresiflik: campaign.agresiflik,
    makaleSayisi: campaign.makaleSayisi,
    createdAt: campaign.createdAt.toISOString(),
    intentContentPairs: buildIntentContentPairs(campaign),
  };
}

function mapPaymentRecord(payment: {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerStatusCode: string | null;
  description: string | null;
  campaignId: string | null;
  createdAt: Date;
}): AdminPaymentRecord {
  return {
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    providerStatusCode: payment.providerStatusCode,
    description: payment.description,
    campaignId: payment.campaignId,
    createdAt: payment.createdAt.toISOString(),
  };
}

export async function getAdminBusinessDetail(
  userId: string,
): Promise<AdminBusinessDetail | null> {
  const supabase = getSupabaseAdmin();
  const { data: authData, error: authError } =
    await supabase.auth.admin.getUserById(userId);

  let campaigns: CampaignWithRelations[] = [];

  if (hasDatabaseUrl()) {
    try {
      campaigns = await getCampaignsForUserViaPrisma(userId);
    } catch (error) {
      console.error("[ADMIN_STORE]: Prisma detay sorgusu hatası:", error);
      campaigns = await getCampaignsForUserViaSupabase(userId);
    }
  } else {
    campaigns = await getCampaignsForUserViaSupabase(userId);
  }

  const payments = await listPaymentsByUserId(userId);
  let paymentTotal = payments
    .filter((payment) =>
      ["success", "succeeded", "paid"].includes(payment.status.toLowerCase()),
    )
    .reduce((sum, payment) => sum + payment.amount, 0);

  if (paymentTotal === 0 && campaigns.length > 0) {
    paymentTotal = campaigns.reduce(
      (sum, campaign) => sum + campaign.gunlukButce * campaign.gunSayisi,
      0,
    );
  } else if (paymentTotal === 0) {
    paymentTotal = await sumSuccessfulPaymentsByUserId(userId);
  }

  const latestCampaign = campaigns[0];
  const authUser = authError ? null : authData.user;
  const metadata = authUser?.user_metadata ?? {};

  const companyName =
    latestCampaign?.markaAdi ??
    (typeof metadata.full_name === "string" ? metadata.full_name : null) ??
    (typeof metadata.company_name === "string" ? metadata.company_name : null) ??
    "—";

  const sector = latestCampaign?.sektor ?? "—";

  if (!authUser && campaigns.length === 0) {
    return null;
  }

  return {
    userId,
    registeredAt:
      authUser?.created_at ??
      latestCampaign?.createdAt.toISOString() ??
      new Date().toISOString(),
    email: authUser?.email ?? "—",
    companyName,
    sector,
    sectorLabel: sector === "—" ? "—" : resolveSectorLabel(sector),
    totalPaymentAmount: paymentTotal,
    currency: payments[0]?.currency ?? "USD",
    campaigns: campaigns.map(mapCampaignHistory),
    payments: payments.map(mapPaymentRecord),
  };
}

export { formatCurrency, resolveSectorLabel };
