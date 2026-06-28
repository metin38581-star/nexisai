import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HubArticlePageContent from "@/components/hub/HubArticlePageContent";
import { buildBlogPostUrl } from "@/lib/blog-url";
import { fetchHubArticleBySlug } from "@/lib/hub-article";
import {
  buildHubArticleDescription,
  buildTechArticleJsonLd,
} from "@/lib/hub-json-ld";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchHubArticleBySlug(slug);

  if (!article) {
    return {
      title: "İçerik Hazırlanıyor | NexisAI Blog",
      robots: { index: false, follow: false },
    };
  }

  const description = buildHubArticleDescription(article.content ?? "");
  const canonical = buildBlogPostUrl(slug);

  return {
    title: `${article.title} | NexisAI Blog`,
    description,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      url: canonical,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug: rawSlug } = await params;
  let slug = rawSlug;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = rawSlug;
  }

  const article = await fetchHubArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const jsonLd = buildTechArticleJsonLd(article);

  return <HubArticlePageContent article={article} jsonLd={jsonLd} />;
}
