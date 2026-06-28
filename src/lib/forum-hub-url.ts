import { resolveSiteOrigin } from "@/lib/site-origin";

export function buildForumHubPath(slug: string): string {
  return `/forum/${encodeURIComponent(slug)}`;
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

  if (trimmed.startsWith("/forum/")) {
    return `${resolveSiteOrigin()}${trimmed}`;
  }

  const slug = trimmed.replace(/^\/+/, "");
  return buildForumHubUrl(slug);
}
