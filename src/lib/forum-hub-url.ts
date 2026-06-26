import { resolveSiteOrigin } from "@/lib/site-origin";

export function buildForumHubPath(slug: string): string {
  return `/forum/${encodeURIComponent(slug)}`;
}

export function buildForumHubUrl(slug: string): string {
  return `${resolveSiteOrigin()}${buildForumHubPath(slug)}`;
}
