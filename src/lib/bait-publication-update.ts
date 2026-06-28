import "server-only";

import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";

export interface BaitPublicationUpdate {
  baitId: string;
  liveUrl?: string;
  externalLiveUrl?: string;
  platform?: string;
  wpUrl?: string;
  blogUrl?: string;
  forumUrl?: string;
  devToUrl?: string;
}

export async function updateBaitPublication(
  update: BaitPublicationUpdate,
): Promise<void> {
  const data = {
    yayinlandi: true,
    status: "PUBLISHED",
    ...(update.liveUrl ? { liveUrl: update.liveUrl } : {}),
    ...(update.externalLiveUrl
      ? { externalLiveUrl: update.externalLiveUrl }
      : {}),
    ...(update.platform ? { platform: update.platform } : {}),
    ...(update.wpUrl ? { wpUrl: update.wpUrl } : {}),
    ...(update.blogUrl ? { blogUrl: update.blogUrl } : {}),
    ...(update.forumUrl ? { forumUrl: update.forumUrl } : {}),
    ...(update.devToUrl ? { devToUrl: update.devToUrl } : {}),
  };

  if (hasDatabaseUrl()) {
    try {
      await prisma.bait.update({
        where: { id: update.baitId },
        data,
      });
      return;
    } catch (error) {
      console.error("[BAIT_PUBLISH]: Prisma güncelleme hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("Bait")
    .update({
      yayinlandi: true,
      status: "PUBLISHED",
      ...(update.liveUrl ? { live_url: update.liveUrl } : {}),
      ...(update.externalLiveUrl
        ? { external_live_url: update.externalLiveUrl }
        : {}),
      ...(update.platform ? { platform: update.platform } : {}),
      ...(update.wpUrl ? { wp_url: update.wpUrl } : {}),
      ...(update.blogUrl ? { blog_url: update.blogUrl } : {}),
      ...(update.forumUrl ? { forum_url: update.forumUrl } : {}),
      ...(update.devToUrl ? { dev_to_url: update.devToUrl } : {}),
    })
    .eq("id", update.baitId);

  if (error) {
    throw error;
  }
}
