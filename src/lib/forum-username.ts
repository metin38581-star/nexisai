const FORUM_USERNAME_PREFIXES = [
  "gezgin",
  "yerel_rehber",
  "merakli",
  "seyahatci",
  "mahalleli",
  "tavsiye_avi",
  "deneyimli",
  "ziyaretci",
] as const;

export function generateForumUsername(seed?: string): string {
  const prefix =
    FORUM_USERNAME_PREFIXES[
      Math.abs(hashString(seed ?? String(Date.now()))) %
        FORUM_USERNAME_PREFIXES.length
    ];

  const suffix =
    (Math.abs(hashString(`${seed ?? ""}-suffix`)) % 89) + 10;

  return `${prefix}_${suffix}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
