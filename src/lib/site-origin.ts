/** NexisAI public site origin — tek kaynak (prod domain env üzerinden). */
export function resolveSiteOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
      : undefined,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeSiteOrigin(candidate);
    if (normalized) {
      return normalized;
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[site-origin]: NEXT_PUBLIC_SITE_URL tanımlı değil; localhost fallback kullanılıyor.",
    );
  }

  return "http://localhost:3000";
}

export function resolveSiteOriginFromRequest(request: Request): string {
  const configured = resolveSiteOrigin();
  if (
    configured !== "http://localhost:3000" ||
    !process.env.VERCEL_URL
  ) {
    return configured;
  }

  const origin = request.headers.get("origin")?.trim().replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host")?.trim();
  const proto = request.headers.get("x-forwarded-proto")?.trim() ?? "https";

  if (origin) {
    return origin;
  }

  if (host) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return configured;
}

export function resolveSitePath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveSiteOrigin()}${normalizedPath}`;
}

function normalizeSiteOrigin(value?: string | null): string | null {
  const trimmed = value?.trim().replace(/\/$/, "");
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}
