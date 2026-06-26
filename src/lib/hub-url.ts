import { resolveSiteOrigin } from "@/lib/site-origin";

export function buildHubArticlePath(slug: string): string {
  return `/p/${slug}`;
}

export function buildHubArticleUrl(slug: string): string {
  return `${resolveSiteOrigin()}${buildHubArticlePath(slug)}`;
}
