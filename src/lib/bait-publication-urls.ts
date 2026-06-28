import { buildBlogPostUrl, normalizeBlogPostUrl } from "@/lib/blog-url";
import { normalizeForumHubUrl } from "@/lib/forum-hub-url";
import { buildHubArticleUrl } from "@/lib/hub-url";

export interface BaitPublicationUrlInput {
  slug: string;
  platform?: string | null;
  liveUrl?: string | null;
  externalLiveUrl?: string | null;
  wpUrl?: string | null;
  blogUrl?: string | null;
  forumUrl?: string | null;
  devToUrl?: string | null;
}

export interface ResolvedBaitPublicationUrls {
  hubUrl: string;
  blogUrl: string | null;
  wpUrl: string | null;
  forumUrl: string | null;
  devToUrl: string | null;
  externalUrl: string | null;
}

function normalizePlatform(platform?: string | null): string {
  return platform?.trim().toUpperCase() ?? "";
}

export function normalizeDevToUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();
      if (host === "dev.to" || host.endsWith(".dev.to")) {
        return trimmed;
      }
    } catch {
      return null;
    }
    return null;
  }

  if (trimmed.startsWith("/")) {
    return `https://dev.to${trimmed}`;
  }

  return `https://dev.to/${trimmed.replace(/^\/+/, "")}`;
}

/** Bait kaydı + slug fallback ile tüm canlı linkleri çözümler. */
export function resolveBaitPublicationUrls(
  bait: BaitPublicationUrlInput,
  campaignForumUrl?: string | null,
): ResolvedBaitPublicationUrls {
  const platform = normalizePlatform(bait.platform);
  const externalUrl = bait.externalLiveUrl?.trim() || bait.liveUrl?.trim() || null;
  const storedWp = bait.wpUrl?.trim() || null;
  const storedBlog = normalizeBlogPostUrl(bait.blogUrl);
  const storedForum = normalizeForumHubUrl(bait.forumUrl ?? campaignForumUrl);
  const storedDevTo = normalizeDevToUrl(bait.devToUrl);

  const hubUrl = buildHubArticleUrl(bait.slug);
  const blogUrl = storedBlog ?? buildBlogPostUrl(bait.slug);

  let wpUrl = storedWp;
  if (!wpUrl && platform === "WORDPRESS" && externalUrl) {
    wpUrl = externalUrl;
  }

  let devToUrl = storedDevTo;
  if (!devToUrl && platform === "DEVTO" && externalUrl) {
    devToUrl = normalizeDevToUrl(externalUrl);
  }

  let resolvedExternalUrl = externalUrl;
  if (devToUrl && resolvedExternalUrl === devToUrl) {
    resolvedExternalUrl = null;
  }

  return {
    hubUrl,
    blogUrl,
    wpUrl,
    forumUrl: storedForum,
    devToUrl,
    externalUrl: resolvedExternalUrl,
  };
}
