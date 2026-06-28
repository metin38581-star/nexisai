import "server-only";

import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";

export interface BaitTenantScope {
  userId: string;
  campaignId: string;
}

/** Kampanya sahibinin userId'sini döner; bait yazımı öncesi zorunlu. */
export async function resolveBaitOwnerUserId(
  campaignId: string,
): Promise<string | null> {
  if (hasDatabaseUrl()) {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { userId: true },
      });
      return campaign?.userId ?? null;
    } catch (error) {
      console.error("[BAIT_SCOPE]: Prisma kampanya sahibi sorgusu hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("Campaign")
    .select("userId")
    .eq("id", campaignId)
    .maybeSingle();

  if (error) {
    console.error("[BAIT_SCOPE]: Supabase kampanya sahibi sorgusu hatası:", error);
    return null;
  }

  return (data?.userId as string | null) ?? null;
}

export function buildBaitTenantScope(
  userId: string,
  campaignId: string,
): BaitTenantScope {
  return { userId, campaignId };
}
