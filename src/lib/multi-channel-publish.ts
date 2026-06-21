import "server-only";

import { distributionEngine } from "@/lib/distribution-engine";
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

/**
 * @deprecated distributionEngine.runDominanceNetworkForBait kullanın.
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

  const username = process.env.GITHUB_RADAR_OWNER?.trim() || "nexisai";
  const repo = process.env.GITHUB_RADAR_REPO?.trim() || "nexisai-radar";
  const privateKey = process.env.NOSTR_PRIVATE_KEY?.trim() || "";

  const [telegraphUrl, githubUrl, nostrEventId] = await Promise.all([
    distributionEngine.distributeToTelegraph(input.title, input.htmlContent),
    distributionEngine.distributeToGitHubPages(
      username,
      repo,
      `${input.slug}.md`,
      markdownContent,
    ),
    distributionEngine.distributeToNostr(
      privateKey,
      `${input.title}\n\n${markdownContent.slice(0, 500)}`,
    ),
  ]);

  const telegraph: ChannelPublishResult = {
    channel: "telegraph",
    ok: Boolean(telegraphUrl),
    url: telegraphUrl ?? undefined,
  };
  const github: ChannelPublishResult = {
    channel: "github",
    ok: Boolean(githubUrl),
    url: githubUrl ?? undefined,
  };
  const nostr: ChannelPublishResult = {
    channel: "nostr",
    ok: Boolean(nostrEventId),
    id: nostrEventId ?? undefined,
  };

  return {
    ok: [telegraph, github, nostr].some((item) => item.ok),
    results: [telegraph, github, nostr],
    telegraph,
    github,
    nostr,
  };
}
