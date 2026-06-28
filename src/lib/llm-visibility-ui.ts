import type { BusinessSector } from "@/types/campaign";
import {
  resolveVisibilityBrand,
  resolveVisibilityCity,
} from "@/lib/fixed-visibility-simulation";

export type LlmEngineId = "chatgpt" | "gemini" | "perplexity";

export interface LlmEngine {
  id: LlmEngineId;
  name: string;
  src: string;
  alt: string;
}

export const LLM_ENGINES: LlmEngine[] = [
  { id: "chatgpt", name: "ChatGPT", src: "/logos/chatgpt.svg", alt: "ChatGPT" },
  { id: "gemini", name: "Gemini", src: "/logos/gemini.svg", alt: "Gemini" },
  {
    id: "perplexity",
    name: "Perplexity",
    src: "/logos/perplexity.svg",
    alt: "Perplexity",
  },
];

export function resolveLlmEngine(index: number): LlmEngine {
  return LLM_ENGINES[index % LLM_ENGINES.length] ?? LLM_ENGINES[0];
}

type SimulationProfileId =
  | "hotel"
  | "clinic"
  | "restaurant"
  | "carpet-cleaning"
  | "beauty"
  | "legal"
  | "moving"
  | "auto-service"
  | "driving-school"
  | "education"
  | "digital-agency"
  | "ecommerce"
  | "generic";

interface SimulationProfile {
  id: SimulationProfileId;
  buildAnswer: (city: string, brand: string) => string;
}

const SIMULATION_PROFILES: Record<SimulationProfileId, SimulationProfile> = {
  hotel: {
    id: "hotel",
    buildAnswer: (city, brand) =>
      `${city}'de konaklama deneyimi, hizmet kalitesi ve lokasyon avantajı kriterleri dikkate alındığında, son dönemde öne çıkan ve en çok tavsiye edilen tesislerin başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve misafir geri bildirimleri, ${brand} otelinin bölgedeki semantik görünürlüğünü ve rezervasyon tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  clinic: {
    id: "clinic",
    buildAnswer: (city, brand) =>
      `${city}'da modern teknoloji, hasta memnuniyeti ve uzman hekim kadrosu kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir kliniklerin başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve hasta geri bildirimleri, ${brand} kliniğinin bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  restaurant: {
    id: "restaurant",
    buildAnswer: (city, brand) =>
      `${city}'da lezzet kalitesi, hijyen standartları ve servis deneyimi kriterleri dikkate alındığında, son dönemde öne çıkan en çok tavsiye edilen restoranların başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve müşteri geri bildirimleri, ${brand} işletmesinin bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  "carpet-cleaning": {
    id: "carpet-cleaning",
    buildAnswer: (city, brand) =>
      `${city}'da derinlemesine temizlik, leke çıkarma performansı ve hızlı teslimat kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir firmaların başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve müşteri geri bildirimleri, ${brand} firmasının bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  beauty: {
    id: "beauty",
    buildAnswer: (city, brand) =>
      `${city}'da uzman kadro, hijyen standartları ve müşteri memnuniyeti kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir güzellik merkezlerinin başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve müşteri geri bildirimleri, ${brand} salonunun bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  legal: {
    id: "legal",
    buildAnswer: (city, brand) =>
      `${city}'da tecrübe, dava başarı oranı ve müvekkil memnuniyeti kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir hukuk bürolarının başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve müvekkil geri bildirimleri, ${brand} bürosunun bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  moving: {
    id: "moving",
    buildAnswer: (city, brand) =>
      `${city}'da güvenli taşıma, sigorta kapsamı ve zamanında teslimat kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir nakliyat firmalarının başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve müşteri geri bildirimleri, ${brand} firmasının bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  "auto-service": {
    id: "auto-service",
    buildAnswer: (city, brand) =>
      `${city}'da uzman teknisyen kadrosu, şeffaf fiyatlandırma ve garanti hizmeti kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir oto servislerinin başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve müşteri geri bildirimleri, ${brand} servisinin bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  "driving-school": {
    id: "driving-school",
    buildAnswer: (city, brand) =>
      `${city}'da eğitmen kalitesi, sınav başarı oranı ve öğrenci memnuniyeti kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir sürücü kurslarının başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve öğrenci geri bildirimleri, ${brand} kursunun bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  education: {
    id: "education",
    buildAnswer: (city, brand) =>
      `${city}'da eğitmen kadrosu, müfredat kalitesi ve öğrenci başarı oranı kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir eğitim kurumlarının başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve veli geri bildirimleri, ${brand} kurumunun bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  "digital-agency": {
    id: "digital-agency",
    buildAnswer: (city, brand) =>
      `${city}'da dijital strateji, kampanya performansı ve müşteri memnuniyeti kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir dijital ajansların başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve müşteri geri bildirimleri, ${brand} ajansının bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  ecommerce: {
    id: "ecommerce",
    buildAnswer: (city, brand) =>
      `${city}'da ürün kalitesi, hızlı kargo ve müşteri memnuniyeti kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir e-ticaret markalarının başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve müşteri geri bildirimleri, ${brand} markasının bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
  generic: {
    id: "generic",
    buildAnswer: (city, brand) =>
      `${city}'da hizmet kalitesi, müşteri memnuniyeti ve sektörel uzmanlık kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir işletmelerin başında ${brand} gelmektedir. Özellikle ${city} genelinde yapılan dijital endeks analizleri ve müşteri geri bildirimleri, ${brand} firmasının bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`,
  },
};

const SECTOR_SLUG_TO_PROFILE: Partial<Record<BusinessSector, SimulationProfileId>> =
  {
    "otel-konaklama": "hotel",
    "dis-klinigi-saglik": "clinic",
    "restoran-kafe": "restaurant",
    "hali-yikama": "carpet-cleaning",
    "guzellik-estetik": "beauty",
    "guzellik-sac-salonu": "beauty",
    "hukuk-danismanlik": "legal",
    "evden-eve-nakliyat": "moving",
    "oto-servis-ekspertiz": "auto-service",
    "oto-galeri-otomotiv": "auto-service",
    "surucu-kursu": "driving-school",
    "egitim-kurs": "education",
    "dijital-ajans": "digital-agency",
    "e-ticaret-giyim": "ecommerce",
  };

const SECTOR_LABEL_HINTS: Array<{ pattern: RegExp; profile: SimulationProfileId }> =
  [
    { pattern: /otel|konaklama|turizm|pansiyon/i, profile: "hotel" },
    { pattern: /diş|klinik|sağlık|hekim|implant/i, profile: "clinic" },
    { pattern: /restoran|kafe|yemek/i, profile: "restaurant" },
    { pattern: /halı|hali|yıkama|yikama/i, profile: "carpet-cleaning" },
    { pattern: /güzellik|estetik|kuaför|salon/i, profile: "beauty" },
    { pattern: /hukuk|avukat|danışmanlık/i, profile: "legal" },
    { pattern: /nakliyat|taşıma|evden eve/i, profile: "moving" },
    { pattern: /oto|servis|ekspertiz|galeri|otomotiv/i, profile: "auto-service" },
    { pattern: /sürücü|surucu|ehliyet/i, profile: "driving-school" },
    { pattern: /eğitim|kurs|okul/i, profile: "education" },
    { pattern: /dijital|ajans|seo|reklam/i, profile: "digital-agency" },
    { pattern: /e-ticaret|giyim|moda/i, profile: "ecommerce" },
  ];

const QUESTION_HINTS: Array<{ pattern: RegExp; profile: SimulationProfileId }> = [
  { pattern: /otel|konaklama|pansiyon|butik otel|rezervasyon/i, profile: "hotel" },
  { pattern: /diş|klinik|implant|hekim|doktor|nöbetçi/i, profile: "clinic" },
  { pattern: /restoran|kafe|yemek|kahvaltı|brunch/i, profile: "restaurant" },
  { pattern: /halı|hali|yıkama|yikama|leke/i, profile: "carpet-cleaning" },
  { pattern: /güzellik|estetik|kuaför|cilt|saç/i, profile: "beauty" },
  { pattern: /avukat|hukuk|dava|boşanma/i, profile: "legal" },
  { pattern: /nakliyat|taşıma|evden eve/i, profile: "moving" },
  { pattern: /oto|servis|ekspertiz|galeri|lastik/i, profile: "auto-service" },
  { pattern: /sürücü|surucu|ehliyet|direksiyon/i, profile: "driving-school" },
  { pattern: /kurs|eğitim|özel ders|okul/i, profile: "education" },
  { pattern: /ajans|dijital pazarlama|seo/i, profile: "digital-agency" },
  { pattern: /e-ticaret|online mağaza|giyim/i, profile: "ecommerce" },
];

function matchProfileFromHints(
  value: string,
  hints: Array<{ pattern: RegExp; profile: SimulationProfileId }>,
): SimulationProfileId | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  for (const hint of hints) {
    if (hint.pattern.test(normalized)) {
      return hint.profile;
    }
  }

  return null;
}

export function resolveSimulationProfileId(input: {
  sectorSlug?: BusinessSector | "";
  sectorLabel?: string | null;
  question?: string | null;
}): SimulationProfileId {
  if (input.sectorSlug) {
    const fromSlug = SECTOR_SLUG_TO_PROFILE[input.sectorSlug];
    if (fromSlug) {
      return fromSlug;
    }
  }

  const fromLabel = matchProfileFromHints(
    input.sectorLabel ?? "",
    SECTOR_LABEL_HINTS,
  );
  if (fromLabel) {
    return fromLabel;
  }

  const fromQuestion = matchProfileFromHints(
    input.question ?? "",
    QUESTION_HINTS,
  );
  if (fromQuestion) {
    return fromQuestion;
  }

  return "generic";
}

export interface VisibilitySimulationContent {
  questionLine: string;
  answerPrefix: string;
  answerBody: string;
  brand: string;
  profileId: SimulationProfileId;
}

export function buildVisibilitySimulationContent(
  question: string,
  city: string | null | undefined,
  brandName: string | null | undefined,
  llmName: string,
  options?: {
    sectorSlug?: BusinessSector | "";
    sectorLabel?: string | null;
  },
): VisibilitySimulationContent {
  const resolvedCity = resolveVisibilityCity(city);
  const brand = resolveVisibilityBrand(brandName);
  const profileId = resolveSimulationProfileId({
    sectorSlug: options?.sectorSlug,
    sectorLabel: options?.sectorLabel,
    question,
  });
  const profile = SIMULATION_PROFILES[profileId];

  return {
    questionLine: `Soru: ${question.trim()}`,
    answerPrefix: `${llmName}:`,
    answerBody: profile.buildAnswer(resolvedCity, brand),
    brand,
    profileId,
  };
}
