import type {
  AdminCampaignContentRow,
  AdminCampaignPublicationSummary,
  AdminContentLinkSet,
} from "@/types/admin";

const LOCAL_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i;

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

/** Admin panelinde localhost fallback URL'lerini gerçek site origin'ine çevirir. */
export function rewriteAdminPublicationUrl(
  url: string | null | undefined,
  siteOrigin: string,
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) {
    return null;
  }

  const origin = normalizeOrigin(siteOrigin);

  if (LOCAL_ORIGIN_PATTERN.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith("/")) {
    return `${origin}${trimmed}`;
  }

  return trimmed;
}

export function rewriteAdminLinkSet(
  links: AdminContentLinkSet,
  siteOrigin: string,
): AdminContentLinkSet {
  return {
    hubUrl: rewriteAdminPublicationUrl(links.hubUrl, siteOrigin),
    blogUrl: rewriteAdminPublicationUrl(links.blogUrl, siteOrigin),
    wpUrl: rewriteAdminPublicationUrl(links.wpUrl, siteOrigin),
    forumUrl: rewriteAdminPublicationUrl(links.forumUrl, siteOrigin),
    devToUrl: rewriteAdminPublicationUrl(links.devToUrl, siteOrigin),
    externalUrl: rewriteAdminPublicationUrl(links.externalUrl, siteOrigin),
  };
}

export function rewriteAdminPublicationSummary(
  summary: AdminCampaignPublicationSummary,
  siteOrigin: string,
): AdminCampaignPublicationSummary {
  return {
    hubUrl: rewriteAdminPublicationUrl(summary.hubUrl, siteOrigin),
    wordpressUrl: rewriteAdminPublicationUrl(summary.wordpressUrl, siteOrigin),
    forumUrl: rewriteAdminPublicationUrl(summary.forumUrl, siteOrigin),
    blogUrl: rewriteAdminPublicationUrl(summary.blogUrl, siteOrigin),
    devToUrl: rewriteAdminPublicationUrl(summary.devToUrl, siteOrigin),
    primaryAuthorityUrl: rewriteAdminPublicationUrl(
      summary.primaryAuthorityUrl,
      siteOrigin,
    ),
  };
}

export function rewriteAdminContentRows(
  rows: AdminCampaignContentRow[],
  siteOrigin: string,
): AdminCampaignContentRow[] {
  return rows.map((row) => ({
    ...row,
    links: rewriteAdminLinkSet(row.links, siteOrigin),
  }));
}

/** Tarayıcı tarafında son güvenlik ağı — API localhost döndürse bile düzeltir. */
export function resolveAdminLinkForClient(url: string): string {
  if (typeof window === "undefined") {
    return url;
  }

  return (
    rewriteAdminPublicationUrl(url, window.location.origin) ??
    url.trim()
  );
}

export function isSameSiteAdminLink(url: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const resolved = resolveAdminLinkForClient(url);
    const parsed = new URL(resolved, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}
