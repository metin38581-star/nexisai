export type DistributionPlatform = "MEDIUM" | "WORDPRESS" | "BLOGGER";

const MEDIUM_SLOT_COUNT = 3;

function isMediumConfigured(): boolean {
  return Boolean(
    process.env.MEDIUM_INTEGRATION_TOKEN?.trim() &&
      process.env.MEDIUM_USER_ID?.trim(),
  );
}

/**
 * Kampanya içeriklerini dağıtım kanallarına böler.
 * - İlk 3 slot (Medium yapılandırılmışsa): MEDIUM
 * - Kalan içeriklerin yarısı: WORDPRESS (native REST API)
 * - Diğer yarısı: BLOGGER (Make.com webhook)
 *
 * 10 içerik + Medium kapalı → 5 WORDPRESS + 5 BLOGGER
 * 10 içerik + Medium açık  → 3 MEDIUM + 4 WORDPRESS + 3 BLOGGER
 */
export function assignDistributionPlatforms(
  articleCount: number,
): DistributionPlatform[] {
  if (articleCount <= 0) {
    return [];
  }

  const mediumCount = isMediumConfigured()
    ? Math.min(MEDIUM_SLOT_COUNT, articleCount)
    : 0;
  const remaining = articleCount - mediumCount;
  const wordpressCount = Math.ceil(remaining / 2);
  const bloggerCount = remaining - wordpressCount;

  const platforms: DistributionPlatform[] = [];

  for (let index = 0; index < mediumCount; index++) {
    platforms.push("MEDIUM");
  }

  for (let index = 0; index < wordpressCount; index++) {
    platforms.push("WORDPRESS");
  }

  for (let index = 0; index < bloggerCount; index++) {
    platforms.push("BLOGGER");
  }

  return platforms;
}

export function applyDistributionPlatforms<
  T extends { platform: string },
>(records: T[]): T[] {
  const platforms = assignDistributionPlatforms(records.length);

  return records.map((record, index) => ({
    ...record,
    platform: platforms[index] ?? "BLOGGER",
  }));
}
