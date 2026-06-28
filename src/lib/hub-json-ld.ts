import type { HubArticle } from "@/lib/hub-article";
import { buildHubArticleUrl } from "@/lib/hub-url";
import { resolveSiteOrigin } from "@/lib/site-origin";

export function buildHubArticleDescription(
  content: string,
  maxLength = 160,
): string {
  return content
    .replace(/<[^>]+>/g, " ")
    .slice(0, maxLength)
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTechArticleJsonLd(article: HubArticle) {
  const siteOrigin = resolveSiteOrigin();
  const organization = {
    "@type": "Organization" as const,
    name: "NexisAI",
    url: siteOrigin,
  };

  const url = buildHubArticleUrl(article.slug).startsWith("http")
    ? buildHubArticleUrl(article.slug)
    : `${siteOrigin}/p/${article.slug}`;

  const description =
    buildHubArticleDescription(article.content ?? "", 320) ||
    `${article.title} — NexisAI GEO operasyon rehberi.`;

  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: article.title,
    description,
    url,
    datePublished: article.createdAt,
    inLanguage: "tr-TR",
    author: organization,
    publisher: {
      ...organization,
      logo: {
        "@type": "ImageObject",
        url: `${siteOrigin}/favicon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}
