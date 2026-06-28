import { slugify } from "@/lib/slugify";

/** Dolu soru metninden benzersiz forum hub slug'ı üretir. */
export function buildQuestionHubSlug(filledQuestion: string): string {
  const trimmed = filledQuestion.trim();
  if (!trimmed) {
    return "";
  }

  return slugify(trimmed);
}
