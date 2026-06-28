import "server-only";

import { resolvePrimaryAuthority } from "@/lib/business-domain";
import { buildForumHubUrl, normalizeForumHubUrl } from "@/lib/forum-hub-url";

export const CENTRAL_BLOG_ORIGIN = "https://nexisai.blog";

export function buildCentralBlogPostPath(slug: string): string {
  return `/posts/${encodeURIComponent(slug)}`;
}

export function buildCentralBlogPostUrl(slug: string): string {
  return `${CENTRAL_BLOG_ORIGIN}${buildCentralBlogPostPath(slug)}`;
}

export function normalizeCentralBlogUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/posts/")) {
    return `${CENTRAL_BLOG_ORIGIN}${trimmed}`;
  }

  const slug = trimmed.replace(/^\/+/, "");
  return slug ? buildCentralBlogPostUrl(slug) : null;
}

export interface CampaignPublicationUrls {
  wordpressUrl: string | null;
  forumUrl: string | null;
  blogUrl: string | null;
  primaryAuthorityUrl: string | null;
}

export function buildCampaignPublicationUrls(input: {
  primarySlug?: string | null;
  forumSlug?: string | null;
  businessDomain?: string | null;
  wordpressUrl?: string | null;
}): CampaignPublicationUrls {
  const authority = resolvePrimaryAuthority(input.businessDomain ?? null);
  const primarySlug = input.primarySlug?.trim() ?? "";
  const forumSlug = input.forumSlug?.trim() ?? "";

  return {
    wordpressUrl: input.wordpressUrl?.trim() || null,
    forumUrl: forumSlug ? buildForumHubUrl(forumSlug) : null,
    blogUrl: primarySlug ? buildCentralBlogPostUrl(primarySlug) : null,
    primaryAuthorityUrl: authority.primaryAuthorityUrl,
  };
}

export function normalizePublicationUrls(input: {
  wordpressUrl?: string | null;
  forumUrl?: string | null;
  blogUrl?: string | null;
  primaryAuthorityUrl?: string | null;
}): CampaignPublicationUrls {
  return {
    wordpressUrl: input.wordpressUrl?.trim() || null,
    forumUrl: normalizeForumHubUrl(input.forumUrl),
    blogUrl: normalizeCentralBlogUrl(input.blogUrl),
    primaryAuthorityUrl: input.primaryAuthorityUrl?.trim() || null,
  };
}
