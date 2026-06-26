import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const STANDALONE_ADMIN_COOKIE = "nexis_admin_session";
export const STANDALONE_ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function resolveStandaloneAdminSecret(): string {
  return (
    process.env.ADMIN_STANDALONE_SECRET?.trim() ??
    process.env.ADMIN_PASSWORD_HASH?.trim() ??
    process.env.ADMIN_EMAIL?.trim() ??
    "nexis-standalone-admin"
  );
}

function resolveStandaloneAdminPassword(): string | null {
  const configured = process.env.ADMIN_STANDALONE_PASSWORD?.trim();
  return configured || null;
}

export function verifyStandaloneAdminPassword(input: string): boolean {
  const expected = resolveStandaloneAdminPassword();
  if (!expected || !input.trim()) {
    return false;
  }

  const provided = Buffer.from(input.trim());
  const target = Buffer.from(expected);

  if (provided.length !== target.length) {
    return false;
  }

  return timingSafeEqual(provided, target);
}

function buildStandaloneSessionSignature(issuedAt: string): string {
  return createHmac("sha256", resolveStandaloneAdminSecret())
    .update(`standalone-admin:${issuedAt}`)
    .digest("hex");
}

export function createStandaloneAdminSessionValue(): string {
  const issuedAt = Date.now().toString();
  const signature = buildStandaloneSessionSignature(issuedAt);
  return `${issuedAt}.${signature}`;
}

export function verifyStandaloneAdminSessionValue(
  value: string | undefined,
): boolean {
  if (!value) {
    return false;
  }

  const [issuedAtRaw, signature] = value.split(".");
  const issuedAt = Number(issuedAtRaw);

  if (!issuedAtRaw || !signature || !Number.isFinite(issuedAt)) {
    return false;
  }

  const ageMs = Date.now() - issuedAt;
  if (ageMs < 0 || ageMs > STANDALONE_ADMIN_SESSION_MAX_AGE_SECONDS * 1000) {
    return false;
  }

  const expected = buildStandaloneSessionSignature(issuedAtRaw);

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
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
    sameSite: "strict" as const,
    path: "/",
    maxAge: STANDALONE_ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}
