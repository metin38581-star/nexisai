/**
 * Türkçe locale'de `.toLowerCase()` I → ı dönüşümü yapar ve HTML5 e-posta
 * validasyonunu bozar. Auth akışında her zaman en-US ile ASCII-safe normalize edilir.
 */
export function normalizeAuthEmailInput(value: string): string {
  return value
    .replace(/\u0131/g, "i") // ı
    .replace(/\u0130/g, "i") // İ
    .replace(/I/g, "i")
    .toLocaleLowerCase("en-US");
}

/** Submit / API doğrulaması için trim + normalize. */
export function normalizeAuthEmail(value: string): string {
  return normalizeAuthEmailInput(value.trim());
}
