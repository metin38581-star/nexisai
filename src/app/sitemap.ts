import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";
import { buildBlogPostPath } from "@/lib/blog-url";
import { buildForumHubPath } from "@/lib/forum-hub-url";
import { fetchAllQuestionHubSlugs } from "@/lib/question-hub-store";
import { resolveSiteOrigin } from "@/lib/site-origin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl, hasSupabaseAdminEnv } from "@/lib/server-env";

export const revalidate = 3600;

async function fetchPublishedBaitEntries(): Promise<
  Array<{ slug: string; createdAt: Date }>
> {
  if (hasDatabaseUrl()) {
    try {
      const rows = await prisma.bait.findMany({
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

      if (rows.length > 0) {
        return rows;
      }
    } catch (error) {
      console.error("[SITEMAP]: Prisma bait listesi alınamadı:", error);
    }
  }

  if (!hasSupabaseAdminEnv()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Bait")
    .select("slug, createdAt, yayinlandi, status")
    .neq("slug", "")
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("[SITEMAP]: Supabase bait listesi alınamadı:", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => {
      const status = String(row.status ?? "").toUpperCase();
      return (
        Boolean(row.yayinlandi) ||
        status === "PUBLISHED" ||
        status === "SUCCESS"
      );
    })
    .map((row) => ({
      slug: row.slug as string,
      createdAt: new Date(row.createdAt as string),
    }));
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

    const articleRoutes: MetadataRoute.Sitemap = baits.flatMap((bait) => [
      {
        url: `${siteOrigin}/p/${encodeURIComponent(bait.slug)}`,
        lastModified: bait.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      {
        url: `${siteOrigin}${buildBlogPostPath(bait.slug)}`,
        lastModified: bait.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      },
    ]);

    const forumRoutes: MetadataRoute.Sitemap = forumHubs.map((hub) => ({
      url: `${siteOrigin}${buildForumHubPath(hub.slug)}`,
      lastModified: hub.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

    return [...staticRoutes, ...articleRoutes, ...forumRoutes];
  } catch (error) {
    console.error("[SITEMAP]: Slug listesi alınamadı:", error);
    return staticRoutes;
  }
}
