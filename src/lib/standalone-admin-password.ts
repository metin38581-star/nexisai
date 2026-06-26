import "server-only";

import { timingSafeEqual } from "node:crypto";

function resolveConfiguredPassword(): string | null {
  const fromEnv = process.env.ADMIN_STANDALONE_PASSWORD?.trim();
  return fromEnv || null;
}

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
