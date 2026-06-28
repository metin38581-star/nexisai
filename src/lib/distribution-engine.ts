import "server-only";

/**
 * NexisAI Hub — hibrid dağıtım motoru.
 * Medium · WordPress · Blogger (Dev.to doğrudan + Make.com fallback) + 3'lü Dominasyon Ağı
 */

import {
  runMultiDistributionPipeline,
  type DistributionProgressListener,
  type GeoDistributionContext,
} from "@/lib/distribution-core";
import {
  dispatchDevToDirectForArticles,
  dispatchMakeWebhooksForArticles,
  dispatchToCentralWebhook,
  isDevToDirectConfigured,
  type GeoDistributionResult,
} from "@/lib/geo-distribution-client";
import type { WebhookArticleSource } from "@/lib/make-webhook-payload";
import { resolveWebhookArticleFields } from "@/lib/make-webhook-payload";
import { publishToMedium } from "@/lib/medium-publish";
import { publishToWordPress } from "@/lib/wordpress-publish";
import { updateBaitPublication } from "@/lib/bait-publication-update";
import { saveCampaignWordPressUrl } from "@/lib/wordpress-campaign-update";
import { distributeToTelegraph as telegraphChannelPublish } from "@/lib/telegraph-publish";
import { distributeToGitHubPages as githubPagesChannelPublish } from "@/lib/github-radar-publish";
import { distributeToNostr as nostrChannelPublish } from "@/lib/nostr-publish";
import {
  buildRadarMarkdownDocument,
  buildNostrSummary,
} from "@/lib/html-content-utils";
import { recordChannelPublication } from "@/lib/distribution-status";
import { buildHubArticleUrl } from "@/lib/hub-url";
import { buildBlogPostUrl } from "@/lib/blog-url";
import { prisma } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/server-env";
import { updateCampaignExternalLiveUrl } from "@/lib/supabase-campaign";

export interface DistributionBait {
  id: string;
  slug: string;
  platform?: string;
  baslik?: string;
  title?: string;
  subject?: string;
  icerik?: string;
  content?: string;
  body?: string;
  html?: string;
}

function baitToWebhookArticle(bait: DistributionBait): WebhookArticleSource {
  return {
    id: bait.id,
    baslik: bait.baslik,
    title: bait.title,
    subject: bait.subject,
    icerik: bait.icerik,
    content: bait.content,
    body: bait.body,
    html: bait.html,
    slug: bait.slug,
  };
}

export interface DistributionResult {
  baitId: string;
  slug: string;
  ok: boolean;
  externalLiveUrl?: string;
  platform?: string;
}

export type DominanceChannelId = "telegraph" | "github_pages" | "nostr";

export interface DominanceNetworkResult {
  baitId: string;
  slug: string;
  telegraphUrl?: string;
  githubPagesUrl?: string;
  nostrEventId?: string;
  errors: Partial<Record<DominanceChannelId, string>>;
}

function resolveGitHubRadarTarget(): { username: string; repo: string } {
  return {
    username: process.env.GITHUB_RADAR_OWNER?.trim() || "nexisai",
    repo: process.env.GITHUB_RADAR_REPO?.trim() || "nexisai-radar",
  };
}

function resolveNostrPrivateKey(): string {
  return process.env.NOSTR_PRIVATE_KEY?.trim() || "";
}

export class DistributionEngine {
  readonly dominanceChannels: readonly DominanceChannelId[] = [
    "telegraph",
    "github_pages",
    "nostr",
  ] as const;

  constructor() {
    console.log(
      "[DAĞITIM MOTORU]: 3'lü Dominasyon Ağı tanımlandı →",
      this.dominanceChannels.join(" | "),
    );
    console.log(
      "[DAĞITIM MOTORU]: Kanallar hazır — Telegra.ph (anonim) · GitHub Pages (md yemi) · Nostr (kind:1 relay)",
    );
    console.log(
      "[DAĞITIM MOTORU]: WordPress akışı korunuyor; dominasyon kanalları WordPress'e paralel tetiklenecek.",
    );
  }

  /** Telegra.ph — sıfır izinli anonim yayın */
  async distributeToTelegraph(
    title: string,
    content: string,
  ): Promise<string | null> {
    try {
      const result = await telegraphChannelPublish(title, content);
      if (!result.ok || !result.url) {
        console.error("[DAĞITIM · TELEGRAPH]:", result.error);
        return null;
      }
      return result.url;
    } catch (error) {
      console.error("[DAĞITIM · TELEGRAPH HATA]:", error);
      return null;
    }
  }

  /** GitHub Pages — Markdown bait deposu */
  async distributeToGitHubPages(
    username: string,
    repo: string,
    filePath: string,
    content: string,
  ): Promise<string | null> {
    try {
      const result = await githubPagesChannelPublish(
        username,
        repo,
        filePath,
        content,
      );
      if (!result.ok || !result.url) {
        console.error("[DAĞITIM · GITHUB PAGES]:", result.error);
        return null;
      }
      return result.url;
    } catch (error) {
      console.error("[DAĞITIM · GITHUB PAGES HATA]:", error);
      return null;
    }
  }

  /** Nostr — kind:1 merkeziyetsiz not */
  async distributeToNostr(
    privateKey: string,
    content: string,
  ): Promise<string | null> {
    try {
      const result = await nostrChannelPublish(privateKey, content);
      if (!result.ok || !result.eventId) {
        console.error("[DAĞITIM · NOSTR]:", result.error);
        return null;
      }
      return result.eventId;
    } catch (error) {
      console.error("[DAĞITIM · NOSTR HATA]:", error);
      return null;
    }
  }

  async runDominanceNetworkForBait(input: {
    bait: DistributionBait;
    campaignId: string;
    hubUrl?: string;
    wordpressUrl?: string;
  }): Promise<DominanceNetworkResult> {
    const { bait, campaignId, hubUrl, wordpressUrl } = input;
    const { baslik, icerik } = resolveBaitFields(bait);
    const { username, repo } = resolveGitHubRadarTarget();
    const markdown = buildRadarMarkdownDocument({
      title: baslik,
      htmlContent: icerik,
      slug: bait.slug,
      hubUrl,
      wordpressUrl,
    });

    const nostrContent = [
      `📡 NexisAI Radar — ${baslik}`,
      "",
      buildNostrSummary(icerik, 220),
      ...(hubUrl ? ["", `Hub: ${hubUrl}`] : []),
      ...(wordpressUrl ? [`WordPress: ${wordpressUrl}`] : []),
      "",
      "#NexisAI #LLM #GEO",
    ].join("\n");

    const errors: Partial<Record<DominanceChannelId, string>> = {};

    const [telegraphUrl, githubPagesUrl, nostrEventId] = await Promise.all([
      this.distributeToTelegraph(baslik, icerik).catch((error) => {
        errors.telegraph =
          error instanceof Error ? error.message : String(error);
        console.error("[DOMİNASYON AĞI · TELEGRAPH]:", errors.telegraph);
        return null;
      }),
      this.distributeToGitHubPages(
        username,
        repo,
        `${bait.slug}.md`,
        markdown,
      ).catch((error) => {
        errors.github_pages =
          error instanceof Error ? error.message : String(error);
        console.error("[DOMİNASYON AĞI · GITHUB]:", errors.github_pages);
        return null;
      }),
      this.distributeToNostr(resolveNostrPrivateKey(), nostrContent).catch(
        (error) => {
          errors.nostr = error instanceof Error ? error.message : String(error);
          console.error("[DOMİNASYON AĞI · NOSTR]:", errors.nostr);
          return null;
        },
      ),
    ]);

    recordChannelPublication({
      baitId: bait.id,
      slug: bait.slug,
      campaignId,
      channel: "telegraph",
      ok: Boolean(telegraphUrl),
      url: telegraphUrl ?? undefined,
      error: errors.telegraph,
    });

    recordChannelPublication({
      baitId: bait.id,
      slug: bait.slug,
      campaignId,
      channel: "github_pages",
      ok: Boolean(githubPagesUrl),
      url: githubPagesUrl ?? undefined,
      error: errors.github_pages,
    });

    recordChannelPublication({
      baitId: bait.id,
      slug: bait.slug,
      campaignId,
      channel: "nostr",
      ok: Boolean(nostrEventId),
      eventId: nostrEventId ?? undefined,
      error: errors.nostr,
    });

    console.log("[DOMİNASYON AĞI]: Bait yayın özeti", {
      baitId: bait.id,
      slug: bait.slug,
      telegraph: telegraphUrl ?? "—",
      githubPages: githubPagesUrl ?? "—",
      nostrEventId: nostrEventId ?? "—",
    });

    return {
      baitId: bait.id,
      slug: bait.slug,
      telegraphUrl: telegraphUrl ?? undefined,
      githubPagesUrl: githubPagesUrl ?? undefined,
      nostrEventId: nostrEventId ?? undefined,
      errors,
    };
  }
}

export const distributionEngine = new DistributionEngine();

function normalizePlatform(platform?: string): string {
  return platform?.trim().toUpperCase() ?? "";
}

async function markBaitPublished(
  bait: Pick<DistributionBait, "id" | "slug" | "platform">,
  liveUrl?: string,
  externalLiveUrl?: string,
  forumUrl?: string,
  devToUrl?: string,
): Promise<void> {
  const platform = normalizePlatform(bait.platform);
  const resolvedExternal = externalLiveUrl ?? liveUrl;
  const hubUrl = buildHubArticleUrl(bait.slug);
  const resolvedDevTo = devToUrl?.trim() || undefined;
  const effectivePlatform = resolvedDevTo ? "DEVTO" : bait.platform;
  const blogUrl =
    platform === "BLOGGER" && resolvedExternal && !resolvedDevTo
      ? resolvedExternal
      : buildBlogPostUrl(bait.slug);

  await updateBaitPublication({
    baitId: bait.id,
    liveUrl: liveUrl ?? hubUrl,
    externalLiveUrl: resolvedExternal ?? hubUrl,
    platform: effectivePlatform,
    blogUrl,
    wpUrl: platform === "WORDPRESS" ? resolvedExternal : undefined,
    forumUrl,
    devToUrl: resolvedDevTo,
  });
}

async function saveCampaignExternalUrl(
  campaignId: string,
  externalLiveUrl: string,
): Promise<void> {
  if (hasDatabaseUrl()) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        externalLiveUrl,
        liveUrl: externalLiveUrl,
      },
    });
  }

  try {
    await updateCampaignExternalLiveUrl(campaignId, externalLiveUrl);
  } catch (error) {
    console.error("[DAĞITIM]: Supabase kampanya URL güncellemesi başarısız:", error);
  }
}

function resolveBaitForumUrl(
  bait: DistributionBait,
  context: GeoDistributionContext,
): string | undefined {
  return context.forumUrlByBaitId?.[bait.id];
}

async function maybeSaveCampaignUrl(
  campaignId: string,
  url: string | undefined,
  campaignExternalUrlSaved: { value: boolean },
): Promise<void> {
  if (!url || campaignExternalUrlSaved.value) {
    return;
  }

  try {
    await saveCampaignExternalUrl(campaignId, url);
    campaignExternalUrlSaved.value = true;
  } catch (error) {
    console.error("[DAĞITIM]: Kampanya URL kaydı başarısız:", error);
  }
}

function resolveBaitFields(bait: DistributionBait) {
  return resolveWebhookArticleFields(baitToWebhookArticle(bait));
}

async function publishBaitToMedium(
  bait: DistributionBait,
  forumUrl?: string,
): Promise<DistributionResult> {
  const { baslik, icerik } = resolveBaitFields(bait);

  try {
    const result = await publishToMedium({
      title: baslik,
      html: icerik,
    });

    if (!result.ok || !result.url) {
      console.warn(
        `[MEDIUM GÜVENLİ MOD]: /p/${bait.slug} — ${result.error ?? "yayınlanamadı"}; NexisAI Hub yayını korunuyor.`,
      );
      return {
        baitId: bait.id,
        slug: bait.slug,
        ok: false,
        platform: "MEDIUM",
      };
    }

    await markBaitPublished(bait, result.url, result.url, forumUrl);

    console.log(`[MEDIUM]: ${baslik} → ${result.url} (Bait ${bait.id})`);

    return {
      baitId: bait.id,
      slug: bait.slug,
      ok: true,
      externalLiveUrl: result.url,
      platform: "MEDIUM",
    };
  } catch (error) {
    console.error(
      `[MEDIUM HATA]: Bait ${bait.id} yayınlanamadı — kampanya devam ediyor:`,
      error,
    );

    return {
      baitId: bait.id,
      slug: bait.slug,
      ok: false,
      platform: "MEDIUM",
    };
  }
}

async function maybeSaveCampaignWordPressUrl(
  campaignId: string,
  url: string | undefined,
  campaignWordPressUrlSaved: { value: boolean },
): Promise<void> {
  if (!url || campaignWordPressUrlSaved.value) {
    return;
  }

  try {
    await saveCampaignWordPressUrl(campaignId, url);
    campaignWordPressUrlSaved.value = true;
    console.log(
      `[WORDPRESS]: Kampanya ${campaignId} wordpress_url kaydedildi → ${url}`,
    );
  } catch (error) {
    console.error("[WORDPRESS]: Kampanya wordpress_url kaydı başarısız:", {
      campaignId,
      url,
      error,
    });
  }
}

async function publishBaitToWordPress(
  bait: DistributionBait,
  campaignId: string,
  campaignWordPressUrlSaved: { value: boolean },
  forumUrl?: string,
): Promise<DistributionResult> {
  const { baslik, icerik } = resolveBaitFields(bait);

  try {
    const result = await publishToWordPress({
      title: baslik,
      content: icerik,
    });

    if (!result.ok || !result.url) {
      console.warn(
        `[WORDPRESS GÜVENLİ MOD]: /p/${bait.slug} — ${result.error ?? "yayınlanamadı"}; NexisAI Hub yayını korunuyor.`,
        {
          baitId: bait.id,
          statusCode: result.statusCode,
          response: result.response,
        },
      );
      return {
        baitId: bait.id,
        slug: bait.slug,
        ok: false,
        platform: "WORDPRESS",
      };
    }

    await markBaitPublished(bait, result.url, result.url, forumUrl);
    await maybeSaveCampaignWordPressUrl(
      campaignId,
      result.url,
      campaignWordPressUrlSaved,
    );

    recordChannelPublication({
      baitId: bait.id,
      slug: bait.slug,
      campaignId,
      channel: "wordpress",
      ok: true,
      url: result.url,
    });

    console.log(
      `[WORDPRESS]: ${baslik} → ${result.url} (Bait ${bait.id})`,
    );

    return {
      baitId: bait.id,
      slug: bait.slug,
      ok: true,
      externalLiveUrl: result.url,
      platform: "WORDPRESS",
    };
  } catch (error) {
    console.error(
      `[WORDPRESS HATA]: Bait ${bait.id} yayınlanamadı — kampanya devam ediyor:`,
      {
        baitId: bait.id,
        slug: bait.slug,
        title: baslik,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
      },
    );

    recordChannelPublication({
      baitId: bait.id,
      slug: bait.slug,
      campaignId,
      channel: "wordpress",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      baitId: bait.id,
      slug: bait.slug,
      ok: false,
      platform: "WORDPRESS",
    };
  }
}

async function publishDominanceNetworkForBaits(
  baits: DistributionBait[],
  results: DistributionResult[],
  campaignId: string,
): Promise<DominanceNetworkResult[]> {
  const dominanceResults: DominanceNetworkResult[] = [];

  for (const bait of baits) {
    const wordpressUrl = results.find(
      (result) =>
        result.baitId === bait.id &&
        result.platform === "WORDPRESS" &&
        result.ok &&
        result.externalLiveUrl,
    )?.externalLiveUrl;

    try {
      const result = await distributionEngine.runDominanceNetworkForBait({
        bait,
        campaignId,
        hubUrl: buildHubArticleUrl(bait.slug),
        wordpressUrl,
      });
      dominanceResults.push(result);
    } catch (error) {
      console.error(
        `[DOMİNASYON AĞI]: Bait ${bait.id} için yayın hatası — kampanya devam ediyor:`,
        {
          baitId: bait.id,
          slug: bait.slug,
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : error,
        },
      );
    }
  }

  return dominanceResults;
}

export async function distributeBaitsToNetwork(
  baits: DistributionBait[],
  context: GeoDistributionContext,
  onProgress?: DistributionProgressListener,
): Promise<DistributionResult[]> {
  if (baits.length === 0) {
    return [];
  }

  try {
  const results: DistributionResult[] = [];
  const campaignExternalUrlSaved = { value: false };
  const campaignWordPressUrlSaved = { value: false };

  onProgress?.({
    progress: 0,
    phase: "started",
    currentIndex: 0,
    totalCount: baits.length,
    terminalMessage: `${context.sehir} kampanyası için dağıtım kanalları hazırlanıyor...`,
  });

  const mediumBaits = baits.filter(
    (bait) => normalizePlatform(bait.platform) === "MEDIUM",
  );
  const wordpressBaits = baits.filter(
    (bait) => normalizePlatform(bait.platform) === "WORDPRESS",
  );
  const bloggerBaits = baits.filter(
    (bait) => normalizePlatform(bait.platform) === "BLOGGER",
  );

  let devToDirectResults = new Map<string, { ok: boolean; url?: string }>();

  if (bloggerBaits.length > 0 && isDevToDirectConfigured()) {
    try {
      devToDirectResults = await dispatchDevToDirectForArticles(
        bloggerBaits.map((bait) => baitToWebhookArticle(bait)),
        context,
      );
    } catch (devToBatchError) {
      console.error(
        "[DEVTO_CRITICAL_EXCEPTION]: Dağıtım motoru Dev.to hatasını yuttu ->",
        devToBatchError,
      );
      devToDirectResults = new Map();
    }
  }

  if (isDevToDirectConfigured() && bloggerBaits.length === 0) {
    console.warn(
      `[DEVTO_DIRECT_API]: DEVTO_API_KEY tanımlı ancak BLOGGER slotu yok (${baits.length} makale — MEDIUM/WORDPRESS only). Dev.to atlanıyor.`,
    );
  }

  const bloggerMakeFallbackBaits = bloggerBaits.filter((bait) => {
    const devToResult = devToDirectResults.get(bait.id);
    return !devToResult?.ok || !devToResult.url;
  });

  for (const bait of bloggerBaits) {
    const devToResult = devToDirectResults.get(bait.id);
    if (!devToResult?.ok || !devToResult.url) {
      continue;
    }

    try {
      await markBaitPublished(
        bait,
        devToResult.url,
        devToResult.url,
        resolveBaitForumUrl(bait, context),
        devToResult.url,
      );

      await maybeSaveCampaignUrl(
        context.campaignId,
        devToResult.url,
        campaignExternalUrlSaved,
      );

      console.log(
        `[DEVTO DIRECT]: /p/${bait.slug} — Bait ${bait.id} SUCCESS → ${devToResult.url}`,
      );

      results.push({
        baitId: bait.id,
        slug: bait.slug,
        ok: true,
        externalLiveUrl: devToResult.url,
        platform: "DEVTO",
      });
    } catch (dbError) {
      console.error(
        `[DEVTO DIRECT] Başarılı ancak kayıt güncellenemedi (${bait.id}):`,
        dbError,
      );
      results.push({
        baitId: bait.id,
        slug: bait.slug,
        ok: true,
        externalLiveUrl: devToResult.url,
        platform: "DEVTO",
      });
    }
  }

  const makeWebhookResults =
    bloggerMakeFallbackBaits.length > 0
      ? await dispatchMakeWebhooksForArticles(
          bloggerMakeFallbackBaits.map((bait) => baitToWebhookArticle(bait)),
          context,
        )
      : new Map<string, GeoDistributionResult>();

  for (const bait of mediumBaits) {
    const result = await publishBaitToMedium(
      bait,
      resolveBaitForumUrl(bait, context),
    );
    results.push(result);
    await maybeSaveCampaignUrl(
      context.campaignId,
      result.externalLiveUrl,
      campaignExternalUrlSaved,
    );
  }

  for (const bait of wordpressBaits) {
    const result = await publishBaitToWordPress(
      bait,
      context.campaignId,
      campaignWordPressUrlSaved,
      resolveBaitForumUrl(bait, context),
    );
    results.push(result);
    await maybeSaveCampaignUrl(
      context.campaignId,
      result.externalLiveUrl,
      campaignExternalUrlSaved,
    );
  }

  if (bloggerMakeFallbackBaits.length === 0) {
    await publishDominanceNetworkForBaits(baits, results, context.campaignId);
    return results;
  }

  const articles: WebhookArticleSource[] = bloggerMakeFallbackBaits.map((bait) =>
    baitToWebhookArticle(bait),
  );

  await runMultiDistributionPipeline(
    articles,
    context,
    async (payload) => {
      const bait = bloggerMakeFallbackBaits.find(
        (entry) => entry.slug === payload.slug,
      );
      const cached = bait ? makeWebhookResults.get(bait.id) : undefined;
      if (cached) {
        return { ok: cached.ok, externalLiveUrl: cached.externalLiveUrl };
      }

      const result = await dispatchToCentralWebhook(payload);
      return { ok: result.ok, externalLiveUrl: result.externalLiveUrl };
    },
    (event) => {
      onProgress?.(event);
    },
    {
      latencyMs: 0,
      onArticleResult: async (index, result) => {
        const bait = bloggerMakeFallbackBaits[index];
        if (!bait) {
          return;
        }

        if (result.ok) {
          try {
            await markBaitPublished(
              bait,
              result.externalLiveUrl,
              result.externalLiveUrl,
              resolveBaitForumUrl(bait, context),
            );

            await maybeSaveCampaignUrl(
              context.campaignId,
              result.externalLiveUrl,
              campaignExternalUrlSaved,
            );

            console.log(
              `[BLOGGER WEBHOOK]: /p/${bait.slug} — Bait ${bait.id} SUCCESS${result.externalLiveUrl ? ` → ${result.externalLiveUrl}` : ""}.`,
            );
            results.push({
              baitId: bait.id,
              slug: bait.slug,
              ok: true,
              externalLiveUrl: result.externalLiveUrl,
              platform: bait.platform,
            });
          } catch (dbError) {
            console.error(
              `[BLOGGER WEBHOOK] Başarılı ancak kayıt güncellenemedi (${bait.id}):`,
              dbError,
            );
            results.push({
              baitId: bait.id,
              slug: bait.slug,
              ok: true,
              externalLiveUrl: result.externalLiveUrl,
              platform: bait.platform,
            });
          }
          return;
        }

        console.error(
          `[BLOGGER WEBHOOK HATASI]: /p/${bait.slug} — webhook reddetti; NexisAI Hub yayını korunuyor.`,
        );
        results.push({
          baitId: bait.id,
          slug: bait.slug,
          ok: false,
          platform: bait.platform,
        });
      },
    },
  );

  await publishDominanceNetworkForBaits(baits, results, context.campaignId);
  return results;
  } catch (error) {
    console.error(
      "[DISTRIBUTION_ENGINE]: Kritik dağıtım hatası yutuldu — hub yayını korunuyor:",
      error,
    );
    return [];
  }
}

export type {
  DistributionPhase,
  DistributionProgressEvent,
  DistributionProgressListener,
  GeoDistributionContext,
  GeoWebhookPayload,
} from "@/lib/distribution-core";

export {
  getDistributionStatusByBait,
  getDistributionStatusByCampaign,
  listDominanceNetworkStatus,
  summarizeDominanceNetwork,
} from "@/lib/distribution-status";
