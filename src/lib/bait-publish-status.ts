import "server-only";

const PUBLISHED_BAIT_STATUSES = new Set(["PUBLISHED", "SUCCESS", "published"]);

export function isPublishedBaitRecord(input: {
  yayinlandi?: boolean | null;
  status?: string | null;
}): boolean {
  const status = input.status?.trim().toUpperCase() ?? "";
  return Boolean(input.yayinlandi) || PUBLISHED_BAIT_STATUSES.has(status);
}
