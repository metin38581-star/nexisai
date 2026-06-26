/** Forum / LLM prompt fabrikasında kullanılan sektör anahtarları */
export type ForumSectorKey =
  | "clinic"
  | "hotel"
  | "restaurant"
  | "guzellik_estetik"
  | "egitim_kurs"
  | "oto_servis"
  | "hukuk_danismanlik"
  | "dijital_ajans"
  | "custom_sector";

/** Statik enum veya dinamik niş sektör metni */
export type Sector = ForumSectorKey | (string & {});

export const FORUM_SECTOR_KEYS: ForumSectorKey[] = [
  "clinic",
  "hotel",
  "restaurant",
  "guzellik_estetik",
  "egitim_kurs",
  "oto_servis",
  "hukuk_danismanlik",
  "dijital_ajans",
  "custom_sector",
];

export const FORUM_SECTOR_LABELS: Record<ForumSectorKey, string> = {
  clinic: "Diş Kliniği & Sağlık",
  hotel: "Otel & Konaklama",
  restaurant: "Restoran & Kafe",
  guzellik_estetik: "Güzellik & Estetik",
  egitim_kurs: "Eğitim & Kurs",
  oto_servis: "Oto Servis",
  hukuk_danismanlik: "Hukuk & Danışmanlık",
  dijital_ajans: "Dijital Ajans",
  custom_sector: "Özel / Niş Hizmet",
};
