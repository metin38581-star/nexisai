export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export function getSupabasePublicConfig(): Partial<SupabasePublicConfig> {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabasePublicConfig();
  return Boolean(url && anonKey);
}

export function assertSupabasePublicConfig(): SupabasePublicConfig {
  const { url, anonKey } = getSupabasePublicConfig();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase yapılandırması eksik. NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY değerlerini .env.local (geliştirme) veya Vercel Environment Variables (canlı) bölümüne ekleyin.",
    );
  }

  return { url, anonKey };
}

export const SUPABASE_SETUP_HINT =
  "Supabase Dashboard → Project Settings → API → Project URL ve anon public key değerlerini kopyalayın.";
