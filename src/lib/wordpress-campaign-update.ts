import "server-only";

import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";

export async function saveCampaignWordPressUrl(
  campaignId: string,
  wordpressUrl: string,
): Promise<void> {
  const url = wordpressUrl.trim();
  if (!url) {
    return;
  }

  if (hasDatabaseUrl()) {
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { wordpressUrl: url },
      });
      return;
    } catch (error) {
      console.error("[WORDPRESS]: Prisma wordpress_url kaydı başarısız:", {
        campaignId,
        url,
        error,
      });
    }
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("Campaign")
    .update({ wordpress_url: url })
    .eq("id", campaignId);

  if (error) {
    throw error;
  }
}
