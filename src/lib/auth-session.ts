import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function resolveSupabaseAuthClient() {
  try {
    return await createSupabaseServerClient();
  } catch (error) {
    console.error("API Hatası:", error);
    return null;
  }
}

export async function getActiveUserId(request?: Request): Promise<string | null> {
  const supabase = await resolveSupabaseAuthClient();
  if (!supabase) {
    return null;
  }

  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) {
          return data.user.id;
        }
      }
    }
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function getActiveSessionUser(request?: Request) {
  const supabase = await resolveSupabaseAuthClient();
  if (!supabase) {
    return null;
  }

  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) {
          return data.user;
        }
      }
    }
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
