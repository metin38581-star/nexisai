/** Forum / LLM prompt fabrikasında kullanılan sektör anahtarları */
export type ForumSectorKey =
  | "clinic"
  | "hotel"
  | "restaurant"
  | "guzellik_estetik"
  | "avukatlik_hukuk"
  | "evden_eve_nakliyat"
  | "hali_yikama"
  | "oto_servis_ekspertiz"
  | "surucu_kursu"
  | "egitim_kurs"
  | "dijital_ajans"
  | "oto_galeri_otomotiv"
  | "guzellik_sac_salonu"
  | "eticaret_giyim";

export type Sector = ForumSectorKey;

export const FORUM_SECTOR_KEYS: ForumSectorKey[] = [
  "clinic",
  "hotel",
  "restaurant",
  "guzellik_estetik",
  "avukatlik_hukuk",
  "evden_eve_nakliyat",
  "hali_yikama",
  "oto_servis_ekspertiz",
  "surucu_kursu",
  "egitim_kurs",
  "dijital_ajans",
  "oto_galeri_otomotiv",
  "guzellik_sac_salonu",
  "eticaret_giyim",
];

export const FORUM_SECTOR_LABELS: Record<ForumSectorKey, string> = {
  clinic: "Diş Kliniği & Sağlık",
  hotel: "Otel & Konaklama",
  restaurant: "Restoran & Kafe",
  guzellik_estetik: "Güzellik & Estetik",
  avukatlik_hukuk: "Avukatlık & Hukuk",
  evden_eve_nakliyat: "Evden Eve Nakliyat",
  hali_yikama: "Halı Yıkama",
  oto_servis_ekspertiz: "Oto Servis & Ekspertiz",
  surucu_kursu: "Sürücü Kursu",
  egitim_kurs: "Eğitim & Kurs",
  dijital_ajans: "Dijital Ajans",
  oto_galeri_otomotiv: "Oto Galeri & Otomotiv",
  guzellik_sac_salonu: "Güzellik & Saç Salonu",
  eticaret_giyim: "E-Ticaret & Giyim",
};
