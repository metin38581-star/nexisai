export function buildHubArticlePath(slug: string): string {
  return `/p/${slug}`;
}

export function buildHubArticleUrl(slug: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const path = buildHubArticlePath(slug);

  if (!siteUrl) {
    return path;
  }

  return `${siteUrl}${path}`;
}
