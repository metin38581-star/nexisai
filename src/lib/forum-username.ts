const FIRST_NAMES = [
  "ahmet",
  "mehmet",
  "mustafa",
  "caner",
  "serkan",
  "murat",
  "burak",
  "hakan",
  "emre",
  "volkan",
  "cem",
  "gizem",
  "selin",
  "ayse",
  "fatma",
  "elif",
  "zeynep",
  "busra",
] as const;

const SURNAMES = [
  "yilmaz",
  "kaya",
  "demir",
  "sahin",
  "celik",
  "arslan",
  "dogan",
  "kurt",
  "ozkan",
  "aydin",
] as const;

/** İki haneli yıl veya plaka tarzı sonekler */
const NUMERIC_SUFFIXES = [
  "06",
  "16",
  "34",
  "35",
  "41",
  "42",
  "55",
  "61",
  "88",
  "94",
  "97",
  "01",
  "07",
  "26",
  "32",
] as const;

type UsernameFormat = "underscore_name" | "dot_name" | "name_number";

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickFrom<T>(items: readonly T[], seed: string, salt: string): T {
  const hash = hashString(`${seed}:${salt}`);
  return items[hash % items.length]!;
}

export function generateForumUsername(seed?: string): string {
  const stableSeed = seed ?? String(Date.now());
  const firstName = pickFrom(FIRST_NAMES, stableSeed, "first");
  const surname = pickFrom(SURNAMES, stableSeed, "last");
  const formatIndex = hashString(`${stableSeed}:format`) % 3;

  const formats: UsernameFormat[] = [
    "underscore_name",
    "dot_name",
    "name_number",
  ];
  const format = formats[formatIndex] ?? "underscore_name";

  if (format === "underscore_name") {
    return `${firstName}_${surname}`;
  }

  if (format === "dot_name") {
    return `${firstName}.${surname}`;
  }

  const numericSuffix = pickFrom(NUMERIC_SUFFIXES, stableSeed, "num");
  return `${firstName}_${numericSuffix}`;
}
