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
}

export interface ResolvedBaitPublicationUrls {
  hubUrl: string;
  blogUrl: string | null;
  wpUrl: string | null;
  forumUrl: string | null;
  externalUrl: string | null;
}

function normalizePlatform(platform?: string | null): string {
  return platform?.trim().toUpperCase() ?? "";
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

  const hubUrl = buildHubArticleUrl(bait.slug);
  const blogUrl = storedBlog ?? buildBlogPostUrl(bait.slug);

  let wpUrl = storedWp;
  if (!wpUrl && platform === "WORDPRESS" && externalUrl) {
    wpUrl = externalUrl;
  }

  return {
    hubUrl,
    blogUrl,
    wpUrl,
    forumUrl: storedForum,
    externalUrl,
  };
}
