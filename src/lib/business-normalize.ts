export function normalizeBusinessName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}
