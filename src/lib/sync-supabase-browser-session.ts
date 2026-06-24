"use client";

import { getSupabaseBrowser } from "@/lib/supabase-browser";

export async function syncSupabaseBrowserSession(
  accessToken: string,
  refreshToken?: string | null,
): Promise<void> {
  if (!refreshToken?.trim()) {
    return;
  }

  try {
    const supabase = getSupabaseBrowser();
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (error) {
    console.error("[AUTH_SYNC]: Tarayıcı oturumu senkronize edilemedi:", error);
  }
}
