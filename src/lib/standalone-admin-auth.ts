import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const STANDALONE_ADMIN_COOKIE = "nexis_admin_session";
export const STANDALONE_ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const SESSION_VERSION = "v1";

export function isStandaloneAdminSecretConfigured(): boolean {
  if (process.env.ADMIN_STANDALONE_SECRET?.trim()) {
    return true;
  }

  return process.env.NODE_ENV !== "production";
}

function resolveStandaloneAdminSecret(): string {
  const secret = process.env.ADMIN_STANDALONE_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ADMIN_STANDALONE_SECRET production ortamında zorunludur.",
    );
  }

  return "nexis-dev-standalone-secret";
}

function buildStandaloneSessionSignature(issuedAt: string): string {
  return createHmac("sha256", resolveStandaloneAdminSecret())
    .update(`${SESSION_VERSION}:standalone-admin:${issuedAt}`)
    .digest("hex");
}

function buildLegacySessionSignature(issuedAt: string): string {
  return createHmac("sha256", resolveStandaloneAdminSecret())
    .update(`standalone-admin:${issuedAt}`)
    .digest("hex");
}

function signaturesMatch(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export function createStandaloneAdminSessionValue(): string {
  const issuedAt = Date.now().toString();
  const signature = buildStandaloneSessionSignature(issuedAt);
  return `${SESSION_VERSION}.${issuedAt}.${signature}`;
}

export type SignedStandaloneAdminSessionResult =
  | { ok: true; sessionToken: string }
  | { ok: false; error: string };

/** ADMIN_STANDALONE_SECRET ile imzalı oturum jetonu üretir; hata durumunda throw etmez. */
export function createSignedStandaloneAdminSession(): SignedStandaloneAdminSessionResult {
  if (!isStandaloneAdminSecretConfigured()) {
    return {
      ok: false,
      error: "Admin oturum imzası yapılandırılmamış. ADMIN_STANDALONE_SECRET tanımlayın.",
    };
  }

  try {
    return {
      ok: true,
      sessionToken: createStandaloneAdminSessionValue(),
    };
  } catch (error) {
    console.error("[ADMIN_SESSION_SIGNING]:", error);
    return {
      ok: false,
      error: "Admin oturum imzası oluşturulamadı.",
    };
  }
}

function parseStandaloneSessionValue(value: string): {
  issuedAtRaw: string;
  signature: string;
} | null {
  const parts = value.split(".");

  if (parts.length === 3 && parts[0] === SESSION_VERSION) {
    const issuedAtRaw = parts[1]?.trim();
    const signature = parts[2]?.trim();
    if (issuedAtRaw && signature) {
      return { issuedAtRaw, signature };
    }
    return null;
  }

  if (parts.length === 2) {
    const issuedAtRaw = parts[0]?.trim();
    const signature = parts[1]?.trim();
    if (issuedAtRaw && signature) {
      return { issuedAtRaw, signature };
    }
  }

  return null;
}

export function verifyStandaloneAdminSessionValue(
  value: string | undefined,
): boolean {
  if (!value || !isStandaloneAdminSecretConfigured()) {
    return false;
  }

  const parsed = parseStandaloneSessionValue(value.trim());
  if (!parsed) {
    return false;
  }

  const { issuedAtRaw, signature } = parsed;
  const issuedAt = Number(issuedAtRaw);

  if (!Number.isFinite(issuedAt)) {
    return false;
  }

  const ageMs = Date.now() - issuedAt;
  if (ageMs < 0 || ageMs > STANDALONE_ADMIN_SESSION_MAX_AGE_SECONDS * 1000) {
    return false;
  }

  const expectedSignatures = [
    buildStandaloneSessionSignature(issuedAtRaw),
    buildLegacySessionSignature(issuedAtRaw),
  ];

  return expectedSignatures.some((expected) =>
    signaturesMatch(expected, signature),
  );
}

export async function hasValidStandaloneAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(STANDALONE_ADMIN_COOKIE)?.value;
  return verifyStandaloneAdminSessionValue(sessionValue);
}

export function buildStandaloneAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: STANDALONE_ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}
