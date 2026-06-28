import "server-only";

import type {
  AdminBusinessDetail,
  AdminBusinessRow,
  AdminCampaignContentRow,
  AdminCampaignDetail,
  AdminCampaignHistory,
  AdminCampaignOverviewRow,
  AdminCampaignPublicationSummary,
  AdminContentLinkSet,
  AdminIntentContentPair,
  AdminOverviewPayload,
  AdminOverviewStats,
  AdminPaymentRecord,
} from "@/types/admin";
import { SECTOR_OPTIONS } from "@/lib/constants";
import { resolveBaitPublicationUrls, normalizeDevToUrl } from "@/lib/bait-publication-urls";
import { buildHubArticleUrl } from "@/lib/hub-url";
import { buildForumHubUrl, normalizeForumHubUrl } from "@/lib/forum-hub-url";
import { buildQuestionHubSlug } from "@/lib/question-hub-slug";
import { buildBlogPostUrl, normalizeBlogPostUrl } from "@/lib/blog-url";
import { normalizePublicationUrls } from "@/lib/publication-urls";
import { resolvePrimaryAuthority } from "@/lib/business-domain";
import {
  rewriteAdminContentRows,
  rewriteAdminLinkSet,
  rewriteAdminPublicationSummary,
  rewriteAdminPublicationUrl,
} from "@/lib/admin-link-url";
import { listCampaignOperationalLogs } from "@/lib/campaign-log-store";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";
import {
  listPaymentsByUserId,
  sumUserPaidTopUpsAllUsers,
  sumUserPaidTopUpsByUserId,
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
  const currency = "TRY";

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
    sumUserPaidTopUpsAllUsers(),
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
      currency: "TRY",
      campaignCount: aggregate.count,
    });
  }

  return rows.sort(
    (a, b) =>
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
  );
}

type CampaignOverviewSource = {
  id: string;
  userId: string | null;
  markaAdi: string;
  sehir: string;
  sektor: string;
  createdAt: Date;
  businessDomain: string | null;
  wordpressUrl: string | null;
  externalLiveUrl: string | null;
  baits: Array<{
    slug: string;
    externalLiveUrl: string | null;
    wpUrl?: string | null;
    devToUrl?: string | null;
    platform?: string | null;
  }>;
  intents: Array<{
    question: string;
  }>;
};

async function listAllCampaignsOverviewViaPrisma(): Promise<
  CampaignOverviewSource[]
> {
  return prisma.campaign.findMany({
    where: { userId: { not: null } },
    select: {
      id: true,
      userId: true,
      markaAdi: true,
      sehir: true,
      sektor: true,
      createdAt: true,
      businessDomain: true,
      wordpressUrl: true,
      externalLiveUrl: true,
      baits: {
        orderBy: { createdAt: "asc" },
        select: {
          slug: true,
          externalLiveUrl: true,
          wpUrl: true,
          devToUrl: true,
          platform: true,
        },
      },
      intents: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { question: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function listAllCampaignsOverviewViaSupabase(): Promise<
  CampaignOverviewSource[]
> {
  const supabase = getSupabaseAdmin();
  const { data: campaigns, error } = await supabase
    .from("Campaign")
    .select("*")
    .not("userId", "is", null)
    .order("createdAt", { ascending: false });

  if (error) {
    throw error;
  }

  const results: CampaignOverviewSource[] = [];

  for (const campaign of campaigns ?? []) {
    const campaignId = campaign.id as string;
    const [{ data: baits }, { data: intents }] = await Promise.all([
      supabase
        .from("Bait")
        .select("slug, external_live_url, wp_url, dev_to_url, platform")
        .eq("campaignId", campaignId)
        .eq("user_id", campaign.userId as string)
        .order("createdAt", { ascending: true }),
      supabase
        .from("CampaignIntent")
        .select("question")
        .eq("campaignId", campaignId)
        .order("sortOrder", { ascending: true })
        .limit(1),
    ]);

    results.push({
      id: campaignId,
      userId: campaign.userId as string,
      markaAdi: campaign.markaAdi as string,
      sehir: campaign.sehir as string,
      sektor: campaign.sektor as string,
      createdAt: new Date(campaign.createdAt as string),
      businessDomain: (campaign.business_domain as string | null) ?? null,
      wordpressUrl: (campaign.wordpress_url as string | null) ?? null,
      externalLiveUrl: (campaign.external_live_url as string | null) ?? null,
      baits: (baits ?? []).map((bait) => ({
        slug: bait.slug as string,
        externalLiveUrl: (bait.external_live_url as string | null) ?? null,
        wpUrl: (bait.wp_url as string | null) ?? null,
        devToUrl: (bait.dev_to_url as string | null) ?? null,
        platform: (bait.platform as string | null) ?? null,
      })),
      intents: (intents ?? []).map((intent) => ({
        question: intent.question as string,
      })),
    });
  }

  return results;
}

async function listAllCampaignsOverview(): Promise<CampaignOverviewSource[]> {
  if (hasDatabaseUrl()) {
    try {
      return await listAllCampaignsOverviewViaPrisma();
    } catch (error) {
      console.error("[ADMIN_STORE]: Prisma kampanya genel bakış hatası:", error);
    }
  }

  return listAllCampaignsOverviewViaSupabase();
}

async function listWalletBalancesViaPrisma(): Promise<Map<string, number>> {
  const wallets = await prisma.wallet.findMany({
    select: { id: true, balance: true },
  });

  return new Map(wallets.map((wallet) => [wallet.id, wallet.balance]));
}

async function listWalletBalancesViaSupabase(): Promise<Map<string, number>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("Wallet").select("id, balance");

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).map((wallet) => [wallet.id as string, Number(wallet.balance)]),
  );
}

async function listWalletBalances(): Promise<Map<string, number>> {
  if (hasDatabaseUrl()) {
    try {
      return await listWalletBalancesViaPrisma();
    } catch (error) {
      console.error("[ADMIN_STORE]: Prisma cüzdan listesi hatası:", error);
    }
  }

  return listWalletBalancesViaSupabase();
}

function resolveCampaignDevToUrl(
  campaign: CampaignOverviewSource,
): string | null {
  for (const bait of campaign.baits) {
    const stored = normalizeDevToUrl(bait.devToUrl);
    if (stored) {
      return stored;
    }

    if (
      bait.platform?.trim().toUpperCase() === "DEVTO" &&
      bait.externalLiveUrl?.trim()
    ) {
      const fromExternal = normalizeDevToUrl(bait.externalLiveUrl);
      if (fromExternal) {
        return fromExternal;
      }
    }
  }

  return null;
}

function resolveCampaignHubUrl(campaign: CampaignOverviewSource): string | null {
  const firstSlug = campaign.baits[0]?.slug?.trim();
  return firstSlug ? buildHubArticleUrl(firstSlug) : null;
}

function resolveCampaignWordpressUrl(
  campaign: CampaignOverviewSource,
): string | null {
  if (campaign.wordpressUrl?.trim()) {
    return campaign.wordpressUrl.trim();
  }

  for (const bait of campaign.baits) {
    if (bait.wpUrl?.trim()) {
      return bait.wpUrl.trim();
    }
    if (
      bait.platform?.trim().toUpperCase() === "WORDPRESS" &&
      bait.externalLiveUrl?.trim()
    ) {
      return bait.externalLiveUrl.trim();
    }
  }

  return campaign.externalLiveUrl?.trim() || null;
}

function resolveCampaignForumUrl(
  campaign: CampaignOverviewSource,
): string | null {
  const firstQuestion = campaign.intents[0]?.question?.trim();
  if (!firstQuestion) {
    return null;
  }

  const slug = buildQuestionHubSlug(firstQuestion);
  return slug ? buildForumHubUrl(slug) : null;
}

function resolveCampaignBlogUrl(
  campaign: CampaignOverviewSource,
): string | null {
  const firstBait = campaign.baits[0];
  return firstBait?.slug ? buildBlogPostUrl(firstBait.slug) : null;
}

function resolveCampaignPrimaryAuthorityUrl(
  campaign: CampaignOverviewSource,
): string | null {
  return resolvePrimaryAuthority(campaign.businessDomain).primaryAuthorityUrl;
}

async function resolveForumUrlsByCampaignIds(
  campaignIds: string[],
): Promise<Map<string, string | null>> {
  const urls = new Map<string, string | null>();
  if (campaignIds.length === 0) {
    return urls;
  }

  if (hasDatabaseUrl()) {
    try {
      const intents = await prisma.campaignIntent.findMany({
        where: { campaignId: { in: campaignIds } },
        orderBy: { sortOrder: "asc" },
        select: { campaignId: true, question: true },
      });

      for (const intent of intents) {
        if (urls.has(intent.campaignId)) {
          continue;
        }

        const slug = buildQuestionHubSlug(intent.question);
        urls.set(
          intent.campaignId,
          slug ? buildForumHubUrl(slug) : null,
        );
      }

      return urls;
    } catch (error) {
      console.error("[ADMIN_STORE]: Forum URL çözümleme hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  for (const campaignId of campaignIds) {
    const { data } = await supabase
      .from("CampaignIntent")
      .select("question")
      .eq("campaignId", campaignId)
      .order("sortOrder", { ascending: true })
      .limit(1)
      .maybeSingle();

    const question = (data?.question as string | undefined)?.trim();
    if (!question) {
      urls.set(campaignId, null);
      continue;
    }

    const slug = buildQuestionHubSlug(question);
    urls.set(campaignId, slug ? buildForumHubUrl(slug) : null);
  }

  return urls;
}

async function loadCampaignLogUserIds(): Promise<Map<string, string>> {
  if (hasDatabaseUrl()) {
    try {
      const logs = await prisma.campaignLog.findMany({
        select: { campaignId: true, userId: true },
      });
      return new Map(logs.map((log) => [log.campaignId, log.userId]));
    } catch (error) {
      console.error("[ADMIN_STORE]: CampaignLog userId listesi hatası:", error);
    }
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("CampaignLog")
      .select("campaign_id, user_id");

    if (error) {
      throw error;
    }

    return new Map(
      (data ?? []).map((log) => [
        log.campaign_id as string,
        log.user_id as string,
      ]),
    );
  } catch (error) {
    console.error("[ADMIN_STORE]: Supabase CampaignLog userId hatası:", error);
    return new Map();
  }
}

function enrichOverviewRows(
  rows: AdminCampaignOverviewRow[],
  walletBalances: Map<string, number>,
  userIdByCampaignId: Map<string, string>,
  forumUrlByCampaignId: Map<string, string | null>,
  creditDeposits: Map<string, number>,
): AdminCampaignOverviewRow[] {
  return rows.map((row) => {
    const userId = userIdByCampaignId.get(row.campaignId);
    const liveWalletBalance =
      userId !== undefined
        ? (walletBalances.get(userId) ?? row.walletBalance)
        : row.walletBalance;
    const forumUrl = normalizeForumHubUrl(
      forumUrlByCampaignId.get(row.campaignId) ?? row.forumUrl,
    );
    const totalDeposited =
      userId !== undefined
        ? (creditDeposits.get(userId) ?? row.totalDeposited)
        : row.totalDeposited;

    const publication = normalizePublicationUrls({
      wordpressUrl: row.wordpressUrl,
      forumUrl,
      blogUrl: row.blogUrl,
      primaryAuthorityUrl: row.primaryAuthorityUrl,
    });

    return {
      ...row,
      walletBalance: liveWalletBalance,
      totalDeposited,
      hubUrl: row.hubUrl,
      ...publication,
    };
  });
}

async function loadCampaignSpendByIds(
  campaignIds: string[],
): Promise<Map<string, number>> {
  const spend = new Map<string, number>();
  if (campaignIds.length === 0 || !hasDatabaseUrl()) {
    return spend;
  }

  try {
    const payments = await prisma.payment.findMany({
      where: {
        campaignId: { in: campaignIds },
        providerStatusCode: "WALLET_DEBIT",
        status: { in: ["success", "succeeded", "paid"] },
      },
      select: { campaignId: true, amount: true },
    });

    for (const payment of payments) {
      if (!payment.campaignId) {
        continue;
      }
      spend.set(payment.campaignId, payment.amount);
    }
  } catch (error) {
    console.error("[ADMIN_STORE]: Kampanya harcama toplamı hatası:", error);
  }

  return spend;
}

function buildOverviewStats(
  authUserCount: number,
  walletBalances: Map<string, number>,
  rows: AdminCampaignOverviewRow[],
): AdminOverviewStats {
  let totalLinksPublished = 0;

  for (const row of rows) {
    if (row.hubUrl) {
      totalLinksPublished += 1;
    }
    if (row.devToUrl) {
      totalLinksPublished += 1;
    }
    if (row.wordpressUrl) {
      totalLinksPublished += 1;
    }
    if (row.forumUrl) {
      totalLinksPublished += 1;
    }
    if (row.blogUrl) {
      totalLinksPublished += 1;
    }
    if (row.primaryAuthorityUrl) {
      totalLinksPublished += 1;
    }
  }

  return {
    totalUsers: authUserCount,
    totalSystemBalance: Array.from(walletBalances.values()).reduce(
      (sum, balance) => sum + balance,
      0,
    ),
    totalLinksPublished,
  };
}

function applySiteOriginToOverviewRow(
  row: AdminCampaignOverviewRow,
  siteOrigin: string,
): AdminCampaignOverviewRow {
  return {
    ...row,
    hubUrl: rewriteAdminPublicationUrl(row.hubUrl, siteOrigin),
    wordpressUrl: rewriteAdminPublicationUrl(row.wordpressUrl, siteOrigin),
    forumUrl: rewriteAdminPublicationUrl(row.forumUrl, siteOrigin),
    blogUrl: rewriteAdminPublicationUrl(row.blogUrl, siteOrigin),
    devToUrl: rewriteAdminPublicationUrl(row.devToUrl, siteOrigin),
    primaryAuthorityUrl: rewriteAdminPublicationUrl(
      row.primaryAuthorityUrl,
      siteOrigin,
    ),
  };
}

function applySiteOriginToCampaignHistory(
  campaign: AdminCampaignHistory,
  siteOrigin: string,
): AdminCampaignHistory {
  return {
    ...campaign,
    publicationSummary: rewriteAdminPublicationSummary(
      campaign.publicationSummary,
      siteOrigin,
    ),
    contentInventory: rewriteAdminContentRows(
      campaign.contentInventory,
      siteOrigin,
    ),
    intentContentPairs: campaign.intentContentPairs.map((pair) => ({
      ...pair,
      bait: pair.bait
        ? {
            ...pair.bait,
            hubUrl:
              rewriteAdminPublicationUrl(pair.bait.hubUrl, siteOrigin) ??
              pair.bait.hubUrl,
            wpUrl: rewriteAdminPublicationUrl(pair.bait.wpUrl, siteOrigin),
            blogUrl: rewriteAdminPublicationUrl(pair.bait.blogUrl, siteOrigin),
            forumUrl: rewriteAdminPublicationUrl(pair.bait.forumUrl, siteOrigin),
            devToUrl: rewriteAdminPublicationUrl(pair.bait.devToUrl, siteOrigin),
            links: rewriteAdminLinkSet(pair.bait.links, siteOrigin),
          }
        : null,
    })),
  };
}

function applySiteOriginToCampaignDetail(
  campaign: AdminCampaignDetail,
  siteOrigin: string,
): AdminCampaignDetail {
  return {
    ...campaign,
    publicationSummary: rewriteAdminPublicationSummary(
      campaign.publicationSummary,
      siteOrigin,
    ),
    contentInventory: rewriteAdminContentRows(
      campaign.contentInventory,
      siteOrigin,
    ),
  };
}

export async function listAdminCampaignOverview(
  siteOrigin?: string,
): Promise<AdminOverviewPayload> {
  const [authUsers, operationalLogs, campaigns, walletBalances, creditDeposits] =
    await Promise.all([
      listAuthUsers(),
      listCampaignOperationalLogs(),
      listAllCampaignsOverview(),
      listWalletBalances(),
      sumUserPaidTopUpsAllUsers(),
    ]);

  const emailByUserId = new Map(authUsers.map((user) => [user.id, user.email]));
  const logByCampaignId = new Map(
    operationalLogs.map((log) => [log.campaignId, log]),
  );

  const allCampaignIds = Array.from(
    new Set([
      ...campaigns.map((campaign) => campaign.id),
      ...operationalLogs.map((log) => log.campaignId),
    ]),
  );

  const [spendByCampaign, forumUrlByCampaignId, userIdByCampaignId] =
    await Promise.all([
      loadCampaignSpendByIds(allCampaignIds),
      resolveForumUrlsByCampaignIds(allCampaignIds),
      loadCampaignLogUserIds(),
    ]);

  const rowsByCampaignId = new Map<string, AdminCampaignOverviewRow>();

  for (const campaign of campaigns) {
    if (!campaign.userId) {
      continue;
    }

    const log = logByCampaignId.get(campaign.id);
    const userId = campaign.userId;

    rowsByCampaignId.set(campaign.id, {
      campaignId: campaign.id,
      userEmail: log?.userEmail ?? emailByUserId.get(userId) ?? "—",
      businessName: log?.businessName ?? campaign.markaAdi,
      sector: log?.sector ?? campaign.sektor,
      sectorLabel: log?.sectorLabel ?? resolveSectorLabel(campaign.sektor),
      city: log?.city ?? campaign.sehir,
      walletBalance: walletBalances.get(userId) ?? log?.walletBalance ?? 0,
      totalDeposited: creditDeposits.get(userId) ?? log?.totalDeposited ?? 0,
      amountSpent: log?.amountSpent ?? spendByCampaign.get(campaign.id) ?? 0,
      hubUrl: resolveCampaignHubUrl(campaign),
      wordpressUrl: log?.wordpressUrl ?? resolveCampaignWordpressUrl(campaign),
      devToUrl: resolveCampaignDevToUrl(campaign),
      forumUrl: normalizeForumHubUrl(
        log?.forumUrl ??
          forumUrlByCampaignId.get(campaign.id) ??
          resolveCampaignForumUrl(campaign),
      ),
      blogUrl: normalizeBlogPostUrl(
        log?.blogUrl ?? resolveCampaignBlogUrl(campaign),
      ),
      primaryAuthorityUrl:
        log?.primaryAuthorityUrl ??
        resolveCampaignPrimaryAuthorityUrl(campaign),
      createdAt: log?.createdAt ?? campaign.createdAt.toISOString(),
    });
  }

  for (const log of operationalLogs) {
    if (!rowsByCampaignId.has(log.campaignId)) {
      rowsByCampaignId.set(log.campaignId, log);
    }
  }

  const rows = enrichOverviewRows(
    Array.from(rowsByCampaignId.values()).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    walletBalances,
    userIdByCampaignId,
    forumUrlByCampaignId,
    creditDeposits,
  );

  const normalizedRows = siteOrigin
    ? rows.map((row) => applySiteOriginToOverviewRow(row, siteOrigin))
    : rows;

  return {
    rows: normalizedRows,
    stats: buildOverviewStats(authUsers.length, walletBalances, normalizedRows),
  };
}

type CampaignWithRelations = {
  id: string;
  userId?: string | null;
  markaAdi: string;
  sehir: string;
  sektor: string;
  gunlukButce: number;
  gunSayisi: number;
  skor: number;
  agresiflik: string;
  makaleSayisi: number;
  createdAt: Date;
  wordpressUrl?: string | null;
  businessDomain?: string | null;
  baits: Array<{
    id: string;
    baslik: string;
    icerik: string;
    slug: string;
    platform?: string | null;
    createdAt: Date;
    liveUrl: string | null;
    externalLiveUrl: string | null;
    wpUrl?: string | null;
    blogUrl?: string | null;
    forumUrl?: string | null;
    devToUrl?: string | null;
  }>;
  intents: Array<{
    id: string;
    question: string;
    simulatedAnswer: string;
    sortOrder: number;
    baitId: string | null;
    createdAt: Date;
    bait: {
      id: string;
      baslik: string;
      icerik: string;
      slug: string;
      createdAt: Date;
      liveUrl: string | null;
      externalLiveUrl: string | null;
      wpUrl?: string | null;
      blogUrl?: string | null;
      forumUrl?: string | null;
      devToUrl?: string | null;
      platform?: string | null;
    } | null;
  }>;
  hubAnswers: Array<{
    id: string;
    username: string;
    content: string;
    createdAt: Date;
    questionHub: {
      slug: string;
      question: string;
    };
  }>;
  campaignLog: {
    wordpressUrl: string | null;
    forumUrl: string | null;
    blogUrl: string | null;
    primaryAuthorityUrl: string | null;
  } | null;
};

async function getCampaignsForUserViaPrisma(
  userId: string,
): Promise<CampaignWithRelations[]> {
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    include: {
      baits: {
        where: { userId },
        orderBy: { createdAt: "asc" },
      },
      intents: {
        orderBy: { sortOrder: "asc" },
        include: { bait: true },
      },
      hubAnswers: {
        orderBy: { createdAt: "asc" },
        include: {
          questionHub: {
            select: { slug: true, question: true },
          },
        },
      },
      campaignLog: {
        select: {
          wordpressUrl: true,
          forumUrl: true,
          blogUrl: true,
          primaryAuthorityUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return campaigns.map((campaign) => ({
    ...campaign,
    userId: campaign.userId,
    hubAnswers: campaign.hubAnswers.map((answer) => ({
      id: answer.id,
      username: answer.username,
      content: answer.content,
      createdAt: answer.createdAt,
      questionHub: answer.questionHub,
    })),
  }));
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

    const [{ data: baits }, { data: intents }, { data: hubAnswers }, { data: campaignLog }] =
      await Promise.all([
      supabase
        .from("Bait")
        .select("*")
        .eq("campaignId", campaignId)
        .eq("user_id", campaign.userId as string)
        .order("createdAt", { ascending: true }),
      supabase
        .from("CampaignIntent")
        .select("*")
        .eq("campaignId", campaignId)
        .order("sortOrder", { ascending: true }),
      supabase
        .from("HubAnswer")
        .select("id, username, content, createdAt, question_id, QuestionHub(slug, question)")
        .eq("campaign_id", campaignId)
        .order("createdAt", { ascending: true }),
      supabase
        .from("CampaignLog")
        .select("wordpress_url, forum_url, blog_url, primary_authority_url")
        .eq("campaign_id", campaignId)
        .maybeSingle(),
    ]);

    const baitMap = new Map(
      (baits ?? []).map((bait) => [bait.id as string, bait]),
    );

    results.push({
      id: campaignId,
      userId: campaign.userId as string | null,
      markaAdi: campaign.markaAdi as string,
      sehir: campaign.sehir as string,
      sektor: campaign.sektor as string,
      gunlukButce: Number(campaign.gunlukButce),
      gunSayisi: Number(campaign.gunSayisi),
      skor: Number(campaign.skor),
      agresiflik: campaign.agresiflik as string,
      makaleSayisi: Number(campaign.makaleSayisi),
      createdAt: new Date(campaign.createdAt as string),
      wordpressUrl: (campaign.wordpress_url as string | null) ?? null,
      businessDomain: (campaign.business_domain as string | null) ?? null,
      baits: (baits ?? []).map((bait) => ({
        id: bait.id as string,
        baslik: bait.baslik as string,
        icerik: bait.icerik as string,
        slug: bait.slug as string,
        platform: (bait.platform as string | null) ?? null,
        createdAt: new Date(bait.createdAt as string),
        liveUrl: (bait.live_url as string | null) ?? null,
        externalLiveUrl: (bait.external_live_url as string | null) ?? null,
        wpUrl: (bait.wp_url as string | null) ?? null,
        blogUrl: (bait.blog_url as string | null) ?? null,
        forumUrl: (bait.forum_url as string | null) ?? null,
        devToUrl: (bait.dev_to_url as string | null) ?? null,
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
          createdAt: new Date(intent.createdAt as string),
          bait: baitRow
            ? {
                id: baitRow.id as string,
                baslik: baitRow.baslik as string,
                icerik: baitRow.icerik as string,
                slug: baitRow.slug as string,
                createdAt: new Date(baitRow.createdAt as string),
                liveUrl: (baitRow.live_url as string | null) ?? null,
                externalLiveUrl:
                  (baitRow.external_live_url as string | null) ?? null,
                wpUrl: (baitRow.wp_url as string | null) ?? null,
                blogUrl: (baitRow.blog_url as string | null) ?? null,
                forumUrl: (baitRow.forum_url as string | null) ?? null,
                devToUrl: (baitRow.dev_to_url as string | null) ?? null,
                platform: (baitRow.platform as string | null) ?? null,
              }
            : null,
        };
      }),
      hubAnswers: (hubAnswers ?? []).flatMap((answer) => {
        const hub = answer.QuestionHub as
          | { slug: string; question: string }
          | { slug: string; question: string }[]
          | null;

        const questionHub = Array.isArray(hub) ? hub[0] : hub;
        if (!questionHub?.slug) {
          return [];
        }

        return [
          {
            id: answer.id as string,
            username: answer.username as string,
            content: answer.content as string,
            createdAt: new Date(answer.createdAt as string),
            questionHub: {
              slug: questionHub.slug,
              question: questionHub.question,
            },
          },
        ];
      }),
      campaignLog: campaignLog
        ? {
            wordpressUrl: (campaignLog.wordpress_url as string | null) ?? null,
            forumUrl: (campaignLog.forum_url as string | null) ?? null,
            blogUrl: (campaignLog.blog_url as string | null) ?? null,
            primaryAuthorityUrl:
              (campaignLog.primary_authority_url as string | null) ?? null,
          }
        : null,
    });
  }

  return results;
}

function truncateExcerpt(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function mapBaitLinkSet(
  bait: CampaignWithRelations["baits"][number],
  campaignForumUrl?: string | null,
): AdminContentLinkSet {
  const resolved = resolveBaitPublicationUrls(
    {
      slug: bait.slug,
      platform: bait.platform,
      liveUrl: bait.liveUrl,
      externalLiveUrl: bait.externalLiveUrl,
      wpUrl: bait.wpUrl,
      blogUrl: bait.blogUrl,
      forumUrl: bait.forumUrl,
      devToUrl: bait.devToUrl,
    },
    campaignForumUrl,
  );

  return {
    hubUrl: resolved.hubUrl,
    blogUrl: resolved.blogUrl,
    wpUrl: resolved.wpUrl,
    forumUrl: resolved.forumUrl,
    devToUrl: resolved.devToUrl,
    externalUrl: resolved.externalUrl,
  };
}

function buildCampaignPublicationSummary(
  campaign: CampaignWithRelations,
): AdminCampaignPublicationSummary {
  const overviewSource: CampaignOverviewSource = {
    id: campaign.id,
    userId: null,
    markaAdi: campaign.markaAdi,
    sehir: campaign.sehir,
    sektor: campaign.sektor,
    createdAt: campaign.createdAt,
    businessDomain: campaign.businessDomain ?? null,
    wordpressUrl: campaign.wordpressUrl ?? null,
    externalLiveUrl: campaign.baits[0]?.externalLiveUrl ?? null,
    baits: campaign.baits.map((bait) => ({
      slug: bait.slug,
      externalLiveUrl: bait.externalLiveUrl,
      wpUrl: bait.wpUrl,
      devToUrl: bait.devToUrl,
      platform: bait.platform,
    })),
    intents: campaign.intents.map((intent) => ({ question: intent.question })),
  };

  const fallbackForumUrl = resolveCampaignForumUrl(overviewSource);

  return {
    hubUrl: resolveCampaignHubUrl(overviewSource),
    wordpressUrl:
      campaign.campaignLog?.wordpressUrl ??
      resolveCampaignWordpressUrl(overviewSource),
    forumUrl: normalizeForumHubUrl(
      campaign.campaignLog?.forumUrl ?? fallbackForumUrl,
    ),
    blogUrl: normalizeBlogPostUrl(
      campaign.campaignLog?.blogUrl ?? resolveCampaignBlogUrl(overviewSource),
    ),
    devToUrl: resolveCampaignDevToUrl(overviewSource),
    primaryAuthorityUrl:
      campaign.campaignLog?.primaryAuthorityUrl ??
      resolveCampaignPrimaryAuthorityUrl(overviewSource),
  };
}

function buildCampaignContentInventory(
  campaign: CampaignWithRelations,
): AdminCampaignContentRow[] {
  const publicationSummary = buildCampaignPublicationSummary(campaign);
  const rows: AdminCampaignContentRow[] = [];

  for (const bait of campaign.baits) {
    rows.push({
      id: bait.id,
      kind: "article",
      title: bait.baslik,
      excerpt: truncateExcerpt(bait.icerik),
      createdAt: bait.createdAt.toISOString(),
      links: mapBaitLinkSet(bait, publicationSummary.forumUrl),
      relatedBaitId: bait.id,
      relatedIntentId: null,
    });
  }

  for (const intent of campaign.intents) {
    const forumSlug = buildQuestionHubSlug(intent.question);
    const intentForumUrl = forumSlug ? buildForumHubUrl(forumSlug) : null;

    rows.push({
      id: intent.id,
      kind: "qa",
      title: intent.question,
      excerpt: truncateExcerpt(intent.simulatedAnswer),
      createdAt: intent.createdAt.toISOString(),
      links: intent.bait
        ? mapBaitLinkSet(intent.bait, intentForumUrl)
        : {
            hubUrl: null,
            blogUrl: null,
            wpUrl: null,
            forumUrl: intentForumUrl,
            devToUrl: null,
            externalUrl: null,
          },
      relatedBaitId: intent.baitId,
      relatedIntentId: intent.id,
    });
  }

  for (const answer of campaign.hubAnswers) {
    rows.push({
      id: answer.id,
      kind: "forum",
      title: answer.questionHub.question,
      excerpt: truncateExcerpt(`${answer.username}: ${answer.content}`),
      createdAt: answer.createdAt.toISOString(),
      links: {
        hubUrl: null,
        blogUrl: null,
        wpUrl: null,
        forumUrl: buildForumHubUrl(answer.questionHub.slug),
        devToUrl: null,
        externalUrl: null,
      },
      relatedBaitId: null,
      relatedIntentId: null,
    });
  }

  return rows.sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function mapBaitPublication(
  bait: CampaignWithRelations["baits"][number],
  campaignForumUrl?: string | null,
): AdminIntentContentPair["bait"] {
  const links = mapBaitLinkSet(bait, campaignForumUrl);

  return {
    id: bait.id,
    baslik: bait.baslik,
    slug: bait.slug,
    createdAt: bait.createdAt.toISOString(),
    liveUrl: bait.liveUrl,
    externalLiveUrl: bait.externalLiveUrl,
    hubUrl: links.hubUrl ?? buildHubArticleUrl(bait.slug),
    wpUrl: links.wpUrl,
    blogUrl: links.blogUrl,
    forumUrl: links.forumUrl,
    devToUrl: links.devToUrl,
    links,
  };
}

function buildIntentContentPairs(
  campaign: CampaignWithRelations,
): AdminIntentContentPair[] {
  const publicationSummary = buildCampaignPublicationSummary(campaign);

  if (campaign.intents.length > 0) {
    return campaign.intents.map((intent) => ({
      intentId: intent.id,
      question: intent.question,
      simulatedAnswer: intent.simulatedAnswer,
      sortOrder: intent.sortOrder,
      bait: intent.bait
        ? mapBaitPublication(intent.bait, publicationSummary.forumUrl)
        : null,
    }));
  }

  return campaign.baits.map((bait, index) => ({
    intentId: null,
    question: "Arşivlenmemiş hedef (eski kampanya)",
    simulatedAnswer: "",
    sortOrder: index,
    bait: mapBaitPublication(bait, publicationSummary.forumUrl),
  }));
}

function mapCampaignHistory(campaign: CampaignWithRelations): AdminCampaignHistory {
  const publicationSummary = buildCampaignPublicationSummary(campaign);

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
    contentInventory: buildCampaignContentInventory(campaign),
    publicationSummary,
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

async function getCampaignWithRelationsByIdViaPrisma(
  campaignId: string,
): Promise<CampaignWithRelations | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      baits: {
        orderBy: { createdAt: "asc" },
      },
      intents: {
        orderBy: { sortOrder: "asc" },
        include: { bait: true },
      },
      hubAnswers: {
        orderBy: { createdAt: "asc" },
        include: {
          questionHub: {
            select: { slug: true, question: true },
          },
        },
      },
      campaignLog: {
        select: {
          wordpressUrl: true,
          forumUrl: true,
          blogUrl: true,
          primaryAuthorityUrl: true,
        },
      },
    },
  });

  if (!campaign) {
    return null;
  }

  const scopedBaits = campaign.userId
    ? campaign.baits.filter((bait) => bait.userId === campaign.userId)
    : campaign.baits;

  return {
    ...campaign,
    userId: campaign.userId,
    baits: scopedBaits,
    hubAnswers: campaign.hubAnswers.map((answer) => ({
      id: answer.id,
      username: answer.username,
      content: answer.content,
      createdAt: answer.createdAt,
      questionHub: answer.questionHub,
    })),
  };
}

async function getCampaignWithRelationsByIdViaSupabase(
  campaignId: string,
): Promise<CampaignWithRelations | null> {
  const supabase = getSupabaseAdmin();
  const { data: campaign, error } = await supabase
    .from("Campaign")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (error || !campaign) {
    return null;
  }

  const [{ data: baits }, { data: intents }, { data: hubAnswers }, { data: campaignLog }] =
    await Promise.all([
      supabase
        .from("Bait")
        .select("*")
        .eq("campaignId", campaignId)
        .eq("user_id", campaign.userId as string)
        .order("createdAt", { ascending: true }),
      supabase
        .from("CampaignIntent")
        .select("*")
        .eq("campaignId", campaignId)
        .order("sortOrder", { ascending: true }),
      supabase
        .from("HubAnswer")
        .select("id, username, content, createdAt, question_id, QuestionHub(slug, question)")
        .eq("campaign_id", campaignId)
        .order("createdAt", { ascending: true }),
      supabase
        .from("CampaignLog")
        .select("wordpress_url, forum_url, blog_url, primary_authority_url")
        .eq("campaign_id", campaignId)
        .maybeSingle(),
    ]);

  const baitMap = new Map(
    (baits ?? []).map((bait) => [bait.id as string, bait]),
  );

  return {
    id: campaignId,
    userId: campaign.userId as string | null,
    markaAdi: campaign.markaAdi as string,
    sehir: campaign.sehir as string,
    sektor: campaign.sektor as string,
    gunlukButce: Number(campaign.gunlukButce),
    gunSayisi: Number(campaign.gunSayisi),
    skor: Number(campaign.skor),
    agresiflik: campaign.agresiflik as string,
    makaleSayisi: Number(campaign.makaleSayisi),
    createdAt: new Date(campaign.createdAt as string),
    wordpressUrl: (campaign.wordpress_url as string | null) ?? null,
    businessDomain: (campaign.business_domain as string | null) ?? null,
    baits: (baits ?? []).map((bait) => ({
      id: bait.id as string,
      baslik: bait.baslik as string,
      icerik: bait.icerik as string,
      slug: bait.slug as string,
      platform: (bait.platform as string | null) ?? null,
      createdAt: new Date(bait.createdAt as string),
      liveUrl: (bait.live_url as string | null) ?? null,
      externalLiveUrl: (bait.external_live_url as string | null) ?? null,
      wpUrl: (bait.wp_url as string | null) ?? null,
      blogUrl: (bait.blog_url as string | null) ?? null,
      forumUrl: (bait.forum_url as string | null) ?? null,
      devToUrl: (bait.dev_to_url as string | null) ?? null,
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
        createdAt: new Date(intent.createdAt as string),
        bait: baitRow
          ? {
              id: baitRow.id as string,
              baslik: baitRow.baslik as string,
              icerik: baitRow.icerik as string,
              slug: baitRow.slug as string,
              createdAt: new Date(baitRow.createdAt as string),
              liveUrl: (baitRow.live_url as string | null) ?? null,
              externalLiveUrl:
                (baitRow.external_live_url as string | null) ?? null,
              wpUrl: (baitRow.wp_url as string | null) ?? null,
              blogUrl: (baitRow.blog_url as string | null) ?? null,
              forumUrl: (baitRow.forum_url as string | null) ?? null,
              devToUrl: (baitRow.dev_to_url as string | null) ?? null,
              platform: (baitRow.platform as string | null) ?? null,
            }
          : null,
      };
    }),
    hubAnswers: (hubAnswers ?? []).flatMap((answer) => {
      const hub = answer.QuestionHub as
        | { slug: string; question: string }
        | { slug: string; question: string }[]
        | null;

      const questionHub = Array.isArray(hub) ? hub[0] : hub;
      if (!questionHub?.slug) {
        return [];
      }

      return [
        {
          id: answer.id as string,
          username: answer.username as string,
          content: answer.content as string,
          createdAt: new Date(answer.createdAt as string),
          questionHub: {
            slug: questionHub.slug,
            question: questionHub.question,
          },
        },
      ];
    }),
    campaignLog: campaignLog
      ? {
          wordpressUrl: (campaignLog.wordpress_url as string | null) ?? null,
          forumUrl: (campaignLog.forum_url as string | null) ?? null,
          blogUrl: (campaignLog.blog_url as string | null) ?? null,
          primaryAuthorityUrl:
            (campaignLog.primary_authority_url as string | null) ?? null,
        }
      : null,
  };
}

async function getCampaignWithRelationsById(
  campaignId: string,
): Promise<CampaignWithRelations | null> {
  if (hasDatabaseUrl()) {
    try {
      const campaign = await getCampaignWithRelationsByIdViaPrisma(campaignId);
      if (campaign) {
        return campaign;
      }
    } catch (error) {
      console.error("[ADMIN_STORE]: Prisma kampanya detay hatası:", error);
    }
  }

  return getCampaignWithRelationsByIdViaSupabase(campaignId);
}

async function resolveUserEmail(userId: string | null | undefined): Promise<string> {
  if (!userId) {
    return "—";
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (!error && data.user?.email) {
      return data.user.email;
    }
  } catch (error) {
    console.error("[ADMIN_STORE]: Kullanıcı e-posta çözümleme hatası:", error);
  }

  return "—";
}

export async function getAdminCampaignDetail(
  campaignId: string,
  siteOrigin?: string,
): Promise<AdminCampaignDetail | null> {
  const campaign = await getCampaignWithRelationsById(campaignId);
  if (!campaign) {
    return null;
  }

  const publicationSummary = buildCampaignPublicationSummary(campaign);
  const userEmail = await resolveUserEmail(campaign.userId);

  const detail: AdminCampaignDetail = {
    id: campaign.id,
    markaAdi: campaign.markaAdi,
    sehir: campaign.sehir,
    sektor: campaign.sektor,
    sectorLabel: resolveSectorLabel(campaign.sektor),
    userEmail,
    createdAt: campaign.createdAt.toISOString(),
    contentInventory: buildCampaignContentInventory(campaign),
    publicationSummary,
  };

  return siteOrigin ? applySiteOriginToCampaignDetail(detail, siteOrigin) : detail;
}

export async function getAdminBusinessDetail(
  userId: string,
  siteOrigin?: string,
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
  let paymentTotal = await sumUserPaidTopUpsByUserId(userId);

  if (paymentTotal === 0 && campaigns.length > 0) {
    paymentTotal = campaigns.reduce(
      (sum, campaign) => sum + campaign.gunlukButce * campaign.gunSayisi,
      0,
    );
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

  const mappedCampaigns = campaigns.map(mapCampaignHistory);

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
    currency: payments[0]?.currency ?? "TRY",
    campaigns: siteOrigin
      ? mappedCampaigns.map((campaign) =>
          applySiteOriginToCampaignHistory(campaign, siteOrigin),
        )
      : mappedCampaigns,
    payments: payments.map(mapPaymentRecord),
  };
}

export { formatCurrency, resolveSectorLabel };
