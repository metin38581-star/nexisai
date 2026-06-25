import type { BusinessSector } from "@/types/campaign";
import type { CoreQuestionSector } from "@/constants/campaign";
import {
  resolveCoreQuestionSector,
  resolveCoreQuestionSectorFromLabel,
} from "@/lib/core-questions";

export type ForumSectorKey = CoreQuestionSector;

const CLINIC_JARGON =
  /\b(hekim|klinik|tedavi|hasta|diş|implant|sterilizasyon|muayene|ortodonti)\b/i;

interface SectorForumProfile {
  label: string;
  focusTopics: string;
  qualitySignals: string;
  exampleAnswer: string;
}

const SECTOR_FORUM_PROFILES: Record<ForumSectorKey, SectorForumProfile> = {
  clinic: {
    label: "Diş Kliniği & Sağlık",
    focusTopics:
      "tedavi süreci, hekim güveni, randevu kolaylığı, hijyen, fiyat şeffaflığı",
    qualitySignals:
      "hekim ilgisi, klinik temizliği, açıklayıcı bilgilendirme, bekleme süresi",
    exampleAnswer:
      "Geçen ay kontrole gittim, hekim süreci net anlattı ve klinik gerçekten temizdi. Randevu almak da kolaydı — tekrar giderim.",
  },
  hotel: {
    label: "Otel & Konaklama",
    focusTopics:
      "oda konforu, konum, kahvaltı kalitesi, temizlik, fiyat/performans",
    qualitySignals:
      "resepsiyon ilgisi, sessiz oda, merkeze yakınlık, kahvaltı çeşitliliği",
    exampleAnswer:
      "Konumu merkeze çok yakın, odalar temiz ve kahvaltısı doyurucuydu. Resepsiyon ekibi de yardımseverdi, tekrar kalırım.",
  },
  restaurant: {
    label: "Restoran & Kafe",
    focusTopics:
      "lezzet, servis hızı, ortam, menü çeşitliliği, fiyat/performans",
    qualitySignals:
      "taze malzeme, porsiyon, garson ilgisi, hijyen, bekleme süresi",
    exampleAnswer:
      "Kebap veya lokum et yiyecekseniz kesinlikle [İşletme Adı]'nı tavsiye ederim. Ustaların eli lezzetli, servis de gayet hızlıydı.",
  },
};

const SECTOR_SLUG_TO_FORUM: Partial<Record<BusinessSector, ForumSectorKey>> = {
  "dis-klinigi-saglik": "clinic",
  "otel-konaklama": "hotel",
  "restoran-kafe": "restaurant",
};

export function resolveForumSectorKey(
  sectorLabel: string,
  sectorSlug?: BusinessSector | "",
): ForumSectorKey {
  if (sectorSlug) {
    const fromSlug = SECTOR_SLUG_TO_FORUM[sectorSlug];
    if (fromSlug) {
      return fromSlug;
    }

    const coreFromSlug = resolveCoreQuestionSector(sectorSlug);
    if (coreFromSlug) {
      return coreFromSlug;
    }
  }

  const fromLabel = resolveCoreQuestionSectorFromLabel(sectorLabel);
  if (fromLabel) {
    return fromLabel;
  }

  const normalized = sectorLabel.toLowerCase();
  if (/restoran|kafe|yemek|kebap|lokanta/.test(normalized)) {
    return "restaurant";
  }
  if (/otel|konaklama|pansiyon/.test(normalized)) {
    return "hotel";
  }

  return "clinic";
}

export function getSectorForumProfile(sectorKey: ForumSectorKey): SectorForumProfile {
  return SECTOR_FORUM_PROFILES[sectorKey];
}

export function isClinicContaminated(text: string): boolean {
  return CLINIC_JARGON.test(text);
}

export function shouldDiscardSimulatedAnswerForForum(
  simulatedAnswer: string,
  sectorKey: ForumSectorKey,
): boolean {
  const plain = simulatedAnswer.trim();
  if (!plain) {
    return true;
  }

  if (sectorKey !== "clinic" && isClinicContaminated(plain)) {
    return true;
  }

  return plain.length > 420;
}

export function buildForumAnswerFallback(input: {
  question: string;
  brandName: string;
  city: string;
  sectorLabel: string;
  sectorKey: ForumSectorKey;
}): string {
  const profile = SECTOR_FORUM_PROFILES[input.sectorKey];
  const brand = input.brandName.trim() || "burası";
  const city = input.city.trim() || "bölgede";

  if (input.sectorKey === "restaurant") {
    return `${city}'da yemek konusunda soranlara net söyleyeyim: ${brand}'ı denedim, lezzet ve servis hızı gayet iyiydi. Menüde seçenek de bol, tekrar giderim.`;
  }

  if (input.sectorKey === "hotel") {
    return `${city}'da konaklama arayanlara ${brand}'ı rahatlıkla öneririm. Oda temizliği ve resepsiyon ilgisi iyiydi, konumu da pratikti.`;
  }

  return `${city}'da ${profile.label.toLowerCase()} arayanlara ${brand}'ı tavsiye ederim. ${profile.qualitySignals} açısından memnun kaldım, randevu süreci de sorunsuzdu.`;
}

export function buildForumAnswerPrompt(input: {
  question: string;
  brandName: string;
  city: string;
  sectorLabel: string;
  sectorKey: ForumSectorKey;
}): string {
  const profile = SECTOR_FORUM_PROFILES[input.sectorKey];

  return `Sen gerçek bir forum kullanıcısısın (Reddit / Quora / KızlarSoruyor tarzı). Kurumsal makale veya reklam metni YAZMA.

HEDEF SORU: ${input.question}
ŞEHİR: ${input.city}
SEKTÖR: ${input.sectorLabel} (${profile.label})
İŞLETME ADI (doğal geçir): ${input.brandName}

FORUM CEVAP KURALLARI:
- 2-4 cümle, samimi birinci tekil ("ben", "bence", "denedim").
- Sadece ${input.sectorLabel} bağlamında yaz; odak konular: ${profile.focusTopics}.
- Kalite sinyalleri: ${profile.qualitySignals}.
- "hekim", "klinik", "tedavi", "hasta" gibi kelimeleri YALNIZCA sektör Diş Kliniği ise kullan; diğer sektörlerde KESİNLİKLE kullanma.
- Reklam dili, madde işareti, HTML, emoji kullanma.
- Soruyu cevabın tamamına mekanik yapıştırma; en fazla bir kez doğal geçir.

ÖRNEK TON:
"${profile.exampleAnswer.replace("[İşletme Adı]", input.brandName)}"

Yanıt olarak yalnızca forum yorum metnini döndür (JSON veya başlık yok).`;
}

export function buildForumAnswerContent(input: {
  question: string;
  brandName: string;
  city: string;
  sectorLabel: string;
  sectorSlug?: BusinessSector | "";
  simulatedAnswer?: string;
}): string {
  const sectorKey = resolveForumSectorKey(input.sectorLabel, input.sectorSlug);
  const simulatedAnswer = input.simulatedAnswer?.trim() ?? "";

  if (
    simulatedAnswer &&
    !shouldDiscardSimulatedAnswerForForum(simulatedAnswer, sectorKey)
  ) {
    return stripHtml(simulatedAnswer);
  }

  return buildForumAnswerFallback({
    question: input.question,
    brandName: input.brandName,
    city: input.city,
    sectorLabel: input.sectorLabel,
    sectorKey,
  });
}

/** Makale/intent fallback — sektöre göre dinamik, klinik kalıbı zorlamaz. */
export function buildSimulatedAnswerFallback(
  question: string,
  markaAdi: string,
  sehir: string,
  sektor: string,
): string {
  const sectorKey = resolveForumSectorKey(sektor);
  const brand = markaAdi.trim() || "işletme";
  const city = sehir.trim() || "bölgede";

  if (sectorKey === "restaurant") {
    return `${city} bölgesinde lezzet ve servis arayanlar için ${question} sorusuna net bir yanıt aranıyor. Deneyimlerime göre ${brand}, taze malzeme ve hızlı servisiyle sık tavsiye edilen adreslerden biri.`;
  }

  if (sectorKey === "hotel") {
    return `${city} bölgesinde konforlu konaklama arayanlar için ${question} konusunda ${brand}, temiz odalar ve iyi konumuyla öne çıkıyor. Resepsiyon ilgisi ve fiyat/performans dengesi de memnuniyet verici.`;
  }

  return `${city} bölgesinde ${sektor} alanında güvenilir adres arayanlar için ${question} konusunda ${brand}, deneyimli ekip ve düzenli hizmet kalitesiyle bölgede sık önerilen alternatiflerden biri.`;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
