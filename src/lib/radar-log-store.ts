import "server-only";

import type { RadarScanResultPayload } from "@/types/market-intelligence";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";

export async function saveCampaignRadarLog(input: {
  campaignId: string;
  scanResult: RadarScanResultPayload;
  shareOfVoice: number;
}): Promise<void> {
  const payload = {
    campaignId: input.campaignId,
    scanResult: input.scanResult,
    shareOfVoice: input.shareOfVoice,
  };

  if (hasDatabaseUrl()) {
    try {
      await prisma.campaignRadarLog.create({
        data: {
          campaignId: input.campaignId,
          scanResult: input.scanResult as object,
          shareOfVoice: input.shareOfVoice,
        },
      });
      return;
    } catch (error) {
      console.error("API Hatası:", error);
    }
  }

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("CampaignRadarLog").insert({
      id: crypto.randomUUID(),
      ...payload,
    });
  } catch (error) {
    console.error("API Hatası:", error);
  }
}

export async function listCampaignRadarLogs(campaignId: string, limit = 48) {
  if (hasDatabaseUrl()) {
    try {
      return prisma.campaignRadarLog.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    } catch (error) {
      console.error("API Hatası:", error);
    }
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("CampaignRadarLog")
    .select("*")
    .eq("campaignId", campaignId)
    .order("createdAt", { ascending: false })
    .limit(limit);

  return data ?? [];
}
