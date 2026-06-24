import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://nexisai-fawn.vercel.app";

export const revalidate = 3600;

async function fetchPublishedBaitEntries(): Promise<
  Array<{ slug: string; createdAt: Date }>
> {
  return prisma.bait.findMany({
    where: {
      slug: { not: "" },
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
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_ORIGIN}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  try {
    const baits = await fetchPublishedBaitEntries();

    const articleRoutes: MetadataRoute.Sitemap = baits.map((bait) => ({
      url: `${SITE_ORIGIN}/p/${encodeURIComponent(bait.slug)}`,
      lastModified: bait.createdAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticRoutes, ...articleRoutes];
  } catch (error) {
    console.error("[SITEMAP]: Bait slug listesi alınamadı:", error);
    return staticRoutes;
  }
}
