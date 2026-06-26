import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";
import { fetchAllQuestionHubSlugs } from "@/lib/question-hub-store";
import { resolveSiteOrigin } from "@/lib/site-origin";

export const revalidate = 3600;

async function fetchPublishedBaitEntries(): Promise<
  Array<{ slug: string; createdAt: Date }>
> {
  return prisma.bait.findMany({
    where: {
      slug: { not: "" },
      OR: [
        { yayinlandi: true },
        { status: { in: ["PUBLISHED", "published", "SUCCESS"] } },
      ],
    },
    select: {
      slug: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = resolveSiteOrigin();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteOrigin}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  try {
    const [baits, forumHubs] = await Promise.all([
      fetchPublishedBaitEntries(),
      fetchAllQuestionHubSlugs(),
    ]);

    const articleRoutes: MetadataRoute.Sitemap = baits.map((bait) => ({
      url: `${siteOrigin}/p/${encodeURIComponent(bait.slug)}`,
      lastModified: bait.createdAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const forumRoutes: MetadataRoute.Sitemap = forumHubs.map((hub) => ({
      url: `${siteOrigin}/forum/${encodeURIComponent(hub.slug)}`,
      lastModified: hub.createdAt,
      changeFrequency: "weekly",
      priority: 0.75,
    }));

    return [...staticRoutes, ...articleRoutes, ...forumRoutes];
  } catch (error) {
    console.error("[SITEMAP]: Slug listesi alınamadı:", error);
    return staticRoutes;
  }
}
