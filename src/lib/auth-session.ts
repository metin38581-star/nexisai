import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function extractProjectRef(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) {
    return null;
  }

  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

async function resolveUserIdFromAccessToken(
  accessToken: string,
): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

function readAccessTokenFromAuthCookie(rawCookie: string): string | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(rawCookie)) as {
      access_token?: string;
    };

    return typeof parsed.access_token === "string"
      ? parsed.access_token
      : null;
  } catch {
    return null;
  }
}

export async function getActiveUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const userId = await resolveUserIdFromAccessToken(token);
      if (userId) {
        return userId;
      }
    }
  }

  const cookieStore = await cookies();
  const projectRef = extractProjectRef(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  );

  if (projectRef) {
    const cookieName = `sb-${projectRef}-auth-token`;
    const rawCookie = cookieStore.get(cookieName)?.value;
    if (rawCookie) {
      const accessToken = readAccessTokenFromAuthCookie(rawCookie);
      if (accessToken) {
        return resolveUserIdFromAccessToken(accessToken);
      }
    }
  }

  return null;
}
