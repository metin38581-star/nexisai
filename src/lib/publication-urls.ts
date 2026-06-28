import "server-only";

import { resolvePrimaryAuthority } from "@/lib/business-domain";
import {
  buildBlogPostUrl,
  normalizeBlogPostUrl,
} from "@/lib/blog-url";
import { buildForumHubUrl, normalizeForumHubUrl } from "@/lib/forum-hub-url";

export {
  buildBlogPostUrl,
  buildBlogPostUrl as buildCentralBlogPostUrl,
  normalizeBlogPostUrl,
  normalizeBlogPostUrl as normalizeCentralBlogUrl,
} from "@/lib/blog-url";

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
    blogUrl: primarySlug ? buildBlogPostUrl(primarySlug) : null,
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
    blogUrl: normalizeBlogPostUrl(input.blogUrl),
    primaryAuthorityUrl: input.primaryAuthorityUrl?.trim() || null,
  };
}
