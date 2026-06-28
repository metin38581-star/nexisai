import "server-only";

import { timingSafeEqual } from "node:crypto";

import { isStandaloneAdminSecretConfigured } from "@/lib/standalone-admin-auth";

function resolveConfiguredPassword(): string | null {
  const fromEnv = process.env.ADMIN_STANDALONE_PASSWORD?.trim();
  return fromEnv || null;
}

/** Girilen şifreyi ADMIN_STANDALONE_PASSWORD ile sabit süreli karşılaştırır. */
export function verifyStandaloneAdminPassword(input: string): boolean {
  const expected = resolveConfiguredPassword();
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

export function isStandaloneAdminPasswordConfigured(): boolean {
  return Boolean(resolveConfiguredPassword());
}

export { isStandaloneAdminSecretConfigured } from "@/lib/standalone-admin-auth";

export function getStandaloneAdminAuthReadiness(): {
  passwordConfigured: boolean;
  secretConfigured: boolean;
  isReady: boolean;
} {
  const passwordConfigured = isStandaloneAdminPasswordConfigured();
  const secretConfigured = isStandaloneAdminSecretConfigured();

  return {
    passwordConfigured,
    secretConfigured,
    isReady: passwordConfigured && secretConfigured,
  };
}
