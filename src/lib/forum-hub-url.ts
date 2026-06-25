const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://nexisai-fawn.vercel.app";

export function buildForumHubPath(slug: string): string {
  return `/forum/${encodeURIComponent(slug)}`;
}

export function buildForumHubUrl(slug: string): string {
  return `${SITE_ORIGIN}${buildForumHubPath(slug)}`;
}
