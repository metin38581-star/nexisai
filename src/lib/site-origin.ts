/** NexisAI public site origin — tek kaynak. */
export function resolveSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ??
    "https://nexisai-fawn.vercel.app"
  );
}
