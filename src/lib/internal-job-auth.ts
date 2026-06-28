import "server-only";

/** Internal cron / background job routes için sunucu tarafı gizli anahtar. */
export function resolveInternalJobSecret(): string | undefined {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    return cronSecret;
  }

  const internalSecret = process.env.INTERNAL_JOB_SECRET?.trim();
  if (internalSecret) {
    return internalSecret;
  }

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRole && process.env.NODE_ENV === "production") {
    return serviceRole;
  }

  return undefined;
}

export function isInternalJobAuthorized(request: Request): boolean {
  const secret = resolveInternalJobSecret();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}
