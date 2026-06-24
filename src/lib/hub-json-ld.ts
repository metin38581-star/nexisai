import type { HubArticle } from "@/lib/hub-article";
import { buildHubArticleUrl } from "@/lib/hub-url";

const NEXIS_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://nexisai-fawn.vercel.app";

const NEXIS_ORGANIZATION = {
  "@type": "Organization" as const,
  name: "NexisAI",
  url: NEXIS_SITE_URL,
};

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
  const url = buildHubArticleUrl(article.slug).startsWith("http")
    ? buildHubArticleUrl(article.slug)
    : `${NEXIS_SITE_URL}/p/${article.slug}`;

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
    author: NEXIS_ORGANIZATION,
    publisher: {
      ...NEXIS_ORGANIZATION,
      logo: {
        "@type": "ImageObject",
        url: `${NEXIS_SITE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}
