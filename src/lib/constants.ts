import type { BusinessSector } from "@/types/campaign";
import { CUSTOM_SECTOR_SLUG } from "@/lib/sector-utils";

export {
  TURKEY_CITY_OPTIONS,
  getCityLabel,
  DEFAULT_CITY,
  type TurkishCitySlug,
} from "@/lib/turkey-cities";

export { CUSTOM_SECTOR_SLUG };

export const SECTOR_OPTIONS: { value: BusinessSector; label: string }[] = [
  { value: "otel-konaklama", label: "Otel & Konaklama" },
  { value: "dis-klinigi-saglik", label: "Diş Kliniği & Sağlık" },
  { value: "restoran-kafe", label: "Restoran & Kafe" },
  { value: "guzellik-estetik", label: "Güzellik & Estetik" },
  { value: "egitim-kurs", label: "Eğitim & Kurs" },
  { value: "oto-servis", label: "Oto Servis" },
  { value: "hukuk-danismanlik", label: "Hukuk & Danışmanlık" },
  { value: "dijital-ajans", label: "Dijital Ajans" },
  { value: CUSTOM_SECTOR_SLUG, label: "Listede Yok (Kendim Yazacağım)" },
  { value: "oto-galeri-otomotiv", label: "Oto Galeri & Otomotiv" },
  { value: "guzellik-sac-salonu", label: "Güzellik & Saç Salonu" },
  { value: "e-ticaret-giyim", label: "E-Ticaret & Giyim" },
];

export const DEFAULT_SECTOR: BusinessSector = "dis-klinigi-saglik";

export const CAMPAIGN_DURATION_OPTIONS = [
  { value: 7, label: "7 Gün" },
  { value: 14, label: "14 Gün" },
  { value: 30, label: "30 Gün" },
  { value: 60, label: "60 Gün" },
  { value: 90, label: "90 Gün" },
];

export const SECTOR_SEARCH_QUERIES: Record<BusinessSector, string> = {
  "otel-konaklama": "en iyi otel",
  "dis-klinigi-saglik": "en iyi diş kliniği",
  "restoran-kafe": "en iyi restoran",
  "guzellik-estetik": "en iyi güzellik merkezi",
  "egitim-kurs": "en iyi kurs merkezi",
  "oto-servis": "en iyi oto servis",
  "hukuk-danismanlik": "en iyi avukat",
  "dijital-ajans": "en iyi dijital ajans",
  "oto-galeri-otomotiv": "en iyi oto galeri",
  "guzellik-sac-salonu": "en iyi güzellik salonu",
  "e-ticaret-giyim": "en iyi giyim mağazası",
  "custom-sector": "en iyi hizmet",
};

export const SUPPORT_EMAIL = "support@nexisai.com";
