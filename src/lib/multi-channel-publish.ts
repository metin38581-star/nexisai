import "server-only";

import { publishToTelegraph } from "@/lib/telegraph-publish";
import { publishToGitHubRadar } from "@/lib/github-radar-publish";
import { publishToNostr } from "@/lib/nostr-publish";
import { buildRadarMarkdownDocument } from "@/lib/html-content-utils";

export type AutonomousChannel = "telegraph" | "github" | "nostr";

export interface ChannelPublishResult {
  channel: AutonomousChannel;
  ok: boolean;
  url?: string;
  id?: string;
  error?: string;
}

export interface PublishToAllChannelsInput {
  title: string;
  htmlContent: string;
  markdownContent?: string;
  slug: string;
  hubUrl?: string;
  wordpressUrl?: string;
}

export interface PublishToAllChannelsResult {
  ok: boolean;
  results: ChannelPublishResult[];
  telegraph?: ChannelPublishResult;
  github?: ChannelPublishResult;
  nostr?: ChannelPublishResult;
}

function toChannelResult(
  channel: AutonomousChannel,
  result: {
    ok: boolean;
    url?: string;
    eventId?: string;
    error?: string;
  },
): ChannelPublishResult {
  return {
    channel,
    ok: result.ok,
    url: result.url,
    id: result.eventId,
    error: result.error,
  };
}

/**
 * Her kampanya içeriğini izin gerektirmeyen 3 otonom kanala paralel fırlatır:
 * Telegra.ph · GitHub Radar (.md) · Nostr relay
 */
export async function publishToAllChannels(
  input: PublishToAllChannelsInput,
): Promise<PublishToAllChannelsResult> {
  const markdownContent =
    input.markdownContent?.trim() ||
    buildRadarMarkdownDocument({
      title: input.title,
      htmlContent: input.htmlContent,
      slug: input.slug,
      hubUrl: input.hubUrl,
      wordpressUrl: input.wordpressUrl,
    });

  const channelResults: ChannelPublishResult[] = [];

  try {
    const [telegraphRaw, githubRaw, nostrRaw] = await Promise.all([
      publishToTelegraph({
        title: input.title,
        htmlContent: input.htmlContent,
      }).catch((error) => ({
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      })),
      publishToGitHubRadar({
        title: input.title,
        htmlContent: input.htmlContent,
        slug: input.slug,
        hubUrl: input.hubUrl,
        wordpressUrl: input.wordpressUrl,
        markdownContent,
      }).catch((error) => ({
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      })),
      publishToNostr({
        title: input.title,
        htmlContent: input.htmlContent,
        hubUrl: input.hubUrl,
        wordpressUrl: input.wordpressUrl,
      }).catch((error) => ({
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      })),
    ]);

    const telegraph = toChannelResult("telegraph", telegraphRaw);
    const github = toChannelResult("github", githubRaw);
    const nostr = toChannelResult("nostr", {
      ok: nostrRaw.ok,
      eventId: "eventId" in nostrRaw ? nostrRaw.eventId : undefined,
      error: nostrRaw.error,
    });

    channelResults.push(telegraph, github, nostr);

    const successCount = channelResults.filter((item) => item.ok).length;

    console.log("[OTONOM KANALLAR]: Özet", {
      title: input.title,
      slug: input.slug,
      successCount,
      telegraph: telegraph.ok ? telegraph.url : telegraph.error,
      github: github.ok ? github.url : github.error,
      nostr: nostr.ok ? nostr.id : nostr.error,
    });

    return {
      ok: successCount > 0,
      results: channelResults,
      telegraph,
      github,
      nostr,
    };
  } catch (error) {
    console.error("[OTONOM KANALLAR HATA]: publishToAllChannels başarısız:", {
      title: input.title,
      slug: input.slug,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });

    return {
      ok: false,
      results: channelResults,
    };
  }
}
