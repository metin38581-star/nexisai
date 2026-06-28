import { resolveSiteOrigin } from "@/lib/site-origin";

export const LEGACY_CENTRAL_BLOG_HOST = "nexisai.blog";

/** Blog yazılarının yayınlandığı origin — varsayılan: punycode destekli ana site. */
export function resolveBlogPostOrigin(): string {
  const configured = process.env.CENTRAL_BLOG_ORIGIN?.trim();
  if (configured) {
    if (/^https?:\/\//i.test(configured)) {
      return configured.replace(/\/$/, "");
    }
    return `https://${configured.replace(/\/$/, "")}`;
  }

  return resolveSiteOrigin();
}

export function buildBlogPostPath(slug: string): string {
  const normalized = slug.trim();
  return `/posts/${encodeURIComponent(normalized)}`;
}

export function buildBlogPostUrl(slug: string): string {
  return `${resolveBlogPostOrigin()}${buildBlogPostPath(slug)}`;
}

/** @deprecated buildBlogPostUrl kullanın */
export const buildCentralBlogPostUrl = buildBlogPostUrl;

export function normalizeBlogPostUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const siteOrigin = resolveSiteOrigin();

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();

      if (host === LEGACY_CENTRAL_BLOG_HOST) {
        return `${siteOrigin}${url.pathname}${url.search}${url.hash}`;
      }

      return trimmed;
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith("/posts/")) {
    return `${siteOrigin}${trimmed}`;
  }

  const slug = trimmed.replace(/^\/+/, "");
  return slug ? buildBlogPostUrl(slug) : null;
}
