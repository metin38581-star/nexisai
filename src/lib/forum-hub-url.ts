import { resolveSiteOrigin } from "@/lib/site-origin";

export function buildForumHubPath(slug: string): string {
  return `/forum/topic/${encodeURIComponent(slug)}`;
}

export function buildForumHubUrl(slug: string): string {
  return `${resolveSiteOrigin()}${buildForumHubPath(slug)}`;
}

/** Veritabanındaki slug veya göreli yolu tam forum URL'sine çevirir. */
export function normalizeForumHubUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/forum/topic/")) {
    return `${resolveSiteOrigin()}${trimmed}`;
  }

  if (trimmed.startsWith("/forum/")) {
    const legacySlug = trimmed.replace(/^\/forum\//, "").replace(/^topic\//, "");
    return legacySlug ? buildForumHubUrl(legacySlug) : null;
  }

  const slug = trimmed.replace(/^\/+/, "");
  return buildForumHubUrl(slug);
}
