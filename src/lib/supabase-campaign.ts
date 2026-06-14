import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface CampaignInsertRow {
  id?: string;
  userId?: string;
  sehir: string;
  sektor: string;
  markaAdi: string;
  skor: number;
  gunlukButce: number;
  gunSayisi: number;
  agresiflik: string;
  makaleSayisi: number;
  radarSikligi: string;
  radarSikligiDakika: number;
}

export async function insertCampaignRow(row: CampaignInsertRow) {
  const supabase = getSupabaseAdmin();
  const { data: campaign, error: dbError } = await supabase
    .from("Campaign")
    .insert([row])
    .select()
    .single();

  if (dbError) {
    throw dbError;
  }

  return campaign;
}

export async function updateCampaignExternalLiveUrl(
  campaignId: string,
  externalLiveUrl: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("Campaign")
    .update({ external_live_url: externalLiveUrl })
    .eq("id", campaignId);

  if (error) {
    throw error;
  }
}
