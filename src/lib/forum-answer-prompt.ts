import type { BusinessSector } from "@/types/campaign";
import type { CoreQuestionSector } from "@/constants/campaign";
import {
  resolveCoreQuestionSector,
  resolveCoreQuestionSectorFromLabel,
} from "@/lib/core-questions";

export type ForumSectorKey = CoreQuestionSector;

const CLINIC_JARGON =
  /\b(hekim|klinik|tedavi|hasta|diş|implant|sterilizasyon|muayene|ortodonti)\b/i;

const ROBOTIC_FORUM_PATTERNS = [
  /sorusuna\s+(yan[iı]t|cevap)/i,
  /sorusuna net/i,
  /sorusuna\s/i,
  /\barayanlara\b/i,
  /tavsiye edilen alternatif/i,
  /bölgesinde .+ arayanlar/i,
  /deneyimlerime göre/i,
  /net bir yanıt aranıyor/i,
  /yoğun tavsiye edilen/i,
  /modern tedavi yöntemleri/i,
];

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
      "Hocam geçen ay kontrole gittim, süreci düzgün anlattılar klinik de temizdi. Randevu almak kolaydı, tekrar giderim açıkçası.",
  },
  hotel: {
    label: "Otel & Konaklama",
    focusTopics:
      "oda konforu, konum, kahvaltı kalitesi, temizlik, fiyat/performans",
    qualitySignals:
      "resepsiyon ilgisi, sessiz oda, merkeze yakınlık, kahvaltı çeşitliliği",
    exampleAnswer:
      "Biz geçen hafta orada kaldık kanka, oda temizdi kahvaltı da fena değildi. Konumu merkeze yakın, tekrar kalırız.",
  },
  restaurant: {
    label: "Restoran & Kafe",
    focusTopics:
      "lezzet, servis hızı, ortam, menü çeşitliliği, fiyat/performans",
    qualitySignals:
      "taze malzeme, porsiyon, garson ilgisi, hijyen, bekleme süresi",
    exampleAnswer:
      "Açıkçası tek geçerim hocam, [İşletme Adı] gerçekten harika yapıyor. Biz geçen hafta gittik, eti lokum gibiydi tavsiye ederim.",
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

export function isRoboticForumText(text: string): boolean {
  return ROBOTIC_FORUM_PATTERNS.some((pattern) => pattern.test(text));
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

  if (isRoboticForumText(plain)) {
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
  const brand = input.brandName.trim() || "orası";
  const city = input.city.trim() || "bölgede";

  if (input.sectorKey === "restaurant") {
    return `Açıkçası ${city}'de tek geçerim hocam, ${brand} gerçekten iyi yapıyor. Biz geçen hafta gittik, lezzet bayağı iyiydi tavsiye ederim.`;
  }

  if (input.sectorKey === "hotel") {
    return `${city}'de konaklama arıyorsan ${brand}'a bi bak kanka, odalar temizdi kahvaltı da fena değildi. Konumu da işe yarar.`;
  }

  return `Hocam ${city}'de diş için ${brand}'a gittim, randevu süreci rahattı hijyen de iyiydi. Açıkçası memnun kaldım, gönül rahatlığıyla öneririm.`;
}

export function buildForumAnswerPrompt(input: {
  question: string;
  brandName: string;
  city: string;
  sectorLabel: string;
  sectorKey: ForumSectorKey;
}): string {
  const profile = SECTOR_FORUM_PROFILES[input.sectorKey];

  return `Sen bir yapay zeka DEĞİLSİN. Ekşi Sözlük, Reddit veya Şikayetvar kullanan, hafif argolu, samimi ve tamamen doğal bir Türk forum kullanıcısısın.

BAĞLAM (soruyu metinde TEKRAR ETME — sadece cevap yaz):
- Soru: ${input.question}
- Şehir: ${input.city}
- Sektör: ${input.sectorLabel} (${profile.label})
- Tavsiye edilen işletme: ${input.brandName}

KESİN YASAKLAR:
- Soruyu metin içinde tekrar etme. "X sorusuna yanıt aranıyor", "sorusuna net bir yanıt" gibi kalıplar KESİNLİKLE YASAK.
- Kurumsal makale, reklam metni, madde işareti, HTML, emoji yazma.
- Robotik tekrar ve uzun paragraflar yazma.
- ${input.sectorKey !== "clinic" ? '"hekim", "klinik", "tedavi", "hasta" kelimelerini KESİNLİKLE kullanma.' : "Sağlık terminolojisini sektöre uygun ve doğal kullan."}

YAZIM KURALLARI:
- 2-4 cümle, konuşma dili, birinci tekil ("ben", "biz", "bence").
- Doğrudan tavsiye veya deneyim cümlesiyle başla.
- "Kanka", "Hocam", "Açıkçası", "Tek geçerim", "Bayağı iyi", "Gönül rahatlığıyla" gibi doğal forum kalıpları kullanabilirsin.
- İşletme adını (${input.brandName}) metne doğal yedir.
- Odak konular: ${profile.focusTopics}.
- Kalite sinyalleri: ${profile.qualitySignals}.

ÖRNEK TON:
"${profile.exampleAnswer.replace("[İşletme Adı]", input.brandName)}"

Yalnızca forum yorum metnini döndür. JSON, başlık veya açıklama ekleme.`;
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
  return buildForumAnswerFallback({
    question,
    brandName: markaAdi,
    city: sehir,
    sectorLabel: sektor,
    sectorKey: resolveForumSectorKey(sektor),
  });
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
