const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  Ç: "c",
  Ğ: "g",
  İ: "i",
  I: "i",
  Ö: "o",
  Ş: "s",
  Ü: "u",
};

export function slugify(text: string): string {
  const normalized = text
    .split("")
    .map((char) => TURKISH_CHAR_MAP[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/&/g, " ve ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return normalized.slice(0, 120).replace(/^-+|-+$/g, "") || "nexisai-makale";
}

export function buildPublishSlug(baslik: string): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${slugify(baslik)}-${suffix}`;
}

export function buildUniqueArticleSlug(
  baslik: string,
  index: number,
  usedSlugs: Set<string>,
): string {
  const base = slugify(baslik);
  let candidate =
    index === 0 ? buildPublishSlug(baslik) : `${base}-${index + 1}-${Math.floor(1000 + Math.random() * 9000)}`;

  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${usedSlugs.size + index + 1}`;
  }

  usedSlugs.add(candidate);
  return candidate;
}
