import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { assertSupabasePublicConfig } from "@/lib/supabase-config";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const { url, anonKey } = assertSupabasePublicConfig();
  cachedClient = createBrowserClient(url, anonKey);

  return cachedClient;
}
