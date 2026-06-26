import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import bcrypt from "bcryptjs";

import { resolveSuperAdminEmail } from "@/lib/admin-emails";

export const ADMIN_PORTAL_COOKIE = "nexis_superadmin_portal";
const PORTAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export function isAdminPortalPasswordRequired(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH?.trim());
}

export async function verifyAdminPortalPassword(
  plainPassword: string,
): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!hash || !plainPassword.trim()) {
    return false;
  }

  return bcrypt.compare(plainPassword.trim(), hash);
}

function buildPortalSessionToken(email: string): string {
  const secret =
    process.env.ADMIN_PASSWORD_HASH?.trim() ??
    process.env.ADMIN_EMAIL?.trim() ??
    "nexis-superadmin";

  return createHmac("sha256", secret)
    .update(`${email.toLowerCase()}:superadmin-portal`)
    .digest("hex");
}

export function createAdminPortalSessionValue(email: string): string {
  const issuedAt = Date.now().toString();
  const signature = buildPortalSessionToken(email);
  return `${issuedAt}.${signature}`;
}

export function verifyAdminPortalSessionValue(
  email: string,
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
  if (ageMs < 0 || ageMs > PORTAL_SESSION_MAX_AGE_SECONDS * 1000) {
    return false;
  }

  const expected = buildPortalSessionToken(email);

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function hasValidAdminPortalSession(
  email: string,
): Promise<boolean> {
  if (!isAdminPortalPasswordRequired()) {
    return true;
  }

  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(ADMIN_PORTAL_COOKIE)?.value;

  return verifyAdminPortalSessionValue(email, sessionValue);
}

export function buildAdminPortalCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/admin-dashboard-secret-nexis",
    maxAge: PORTAL_SESSION_MAX_AGE_SECONDS,
  };
}

export function assertSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return email.trim().toLowerCase() === resolveSuperAdminEmail();
}
