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
  return buildForumThreadPrompt(input);
}

export interface ForumThreadCommentDraft {
  content: string;
  isFeatured: boolean;
}

export function buildForumThreadPrompt(input: {
  question: string;
  brandName: string;
  city: string;
  sectorLabel: string;
  sectorKey: ForumSectorKey;
}): string {
  const profile = SECTOR_FORUM_PROFILES[input.sectorKey];

  return `Sen bir yapay zeka DEĞİLSİN. Ekşi Sözlük, KızlarSoruyor veya Reddit'teki gerçek Türk forum tartışmasını simüle ediyorsun.

BAĞLAM:
- Forum başlığı / soru: ${input.question}
- Şehir: ${input.city}
- Sektör: ${input.sectorLabel} (${profile.label})
- Müşteri işletmesi (öne çıkarılacak): ${input.brandName}

GÖREV:
Sektör, şehir ve müşteri işletme bilgisini kullanarak sanki bir forum başlığı altındaki tartışmaymış gibi 3 veya 4 farklı kullanıcının ağzından alt alta yorumlar üret.

KURALLAR:
- Yorumlardan BİR TANESİ müşteri işletmesi (${input.brandName}) için en popüler, en beğenilen ve öne çıkan tavsiye olsun (isFeatured: true).
- Diğer 2-3 yorum tamamen organik olsun: sektöre özgü genel tavsiyeler, menü/konaklama/randevu ipuçları veya hafif nötr-olumlu deneyimler (isFeatured: false).
- Organik yorumlar doğrudan rakip övmesin; ortama gerçekçilik katsın.
- Soruyu metin içinde tekrar etme ("X sorusuna yanıt" YASAK).
- Her yorum 1-3 cümle, konuşma dili: "kanka", "hocam", "açıkçası", "tek geçerim" kullanılabilir.
- ${input.sectorKey !== "clinic" ? '"hekim", "klinik", "tedavi", "hasta" kelimelerini organik yorumlarda KULLANMA.' : "Sağlık terminolojisini yalnızca featured yorumda doğal kullan."}
- HTML, emoji, madde işareti yok.

ÇIKTI FORMATI — yalnızca geçerli JSON nesnesi (json_object). Kök anahtar "comments" olmalı, 3 veya 4 eleman:
{
  "comments": [
    { "content": "...", "isFeatured": true },
    { "content": "...", "isFeatured": false },
    { "content": "...", "isFeatured": false }
  ]
}

ÖRNEK (otel):
{
  "comments": [
    { "content": "Bolu'da konaklama arıyorsan ${input.brandName}'a bi bak kanka, odalar temizdi kahvaltı da fena değildi.", "isFeatured": true },
    { "content": "Butik otellerde kahvaltı genelde daha iyi oluyor, büyük otellerde oda kalitesi değişebiliyor.", "isFeatured": false },
    { "content": "Yazın rezervasyonu son ana bırakmayın, merkezde yer bulmak zorlaşıyor.", "isFeatured": false }
  ]
}

Başka metin yazma. username alanı ekleme — sistem atayacak.`;
}

function extractJsonPayload(raw: string): unknown | null {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const attempts = [
    candidate,
    candidate.match(/\{[\s\S]*\}/)?.[0],
    candidate.match(/\[[\s\S]*\]/)?.[0],
  ].filter((value): value is string => Boolean(value));

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeThreadPayload(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!parsed || typeof parsed !== "object") {
    return [];
  }

  const record = parsed as Record<string, unknown>;
  for (const key of ["comments", "replies", "thread", "answers", "items"]) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [];
}

export function parseForumThreadComments(
  raw: string,
  sectorKey: ForumSectorKey,
): ForumThreadCommentDraft[] {
  const parsed = extractJsonPayload(raw);
  if (parsed === null) {
    return [];
  }

  const items = normalizeThreadPayload(parsed);
  if (items.length === 0) {
    return [];
  }

  const comments = items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as { content?: string; isFeatured?: boolean };
      const content = record.content?.trim().replace(/\s+/g, " ");
      if (!content || content.length < 12) {
        return null;
      }
      if (sectorKey !== "clinic" && isClinicContaminated(content)) {
        return null;
      }
      if (isRoboticForumText(content)) {
        return null;
      }
      return {
        content: content.slice(0, 600),
        isFeatured: Boolean(record.isFeatured),
      };
    })
    .filter((item): item is ForumThreadCommentDraft => item !== null);

  if (comments.length < 3) {
    return [];
  }

  const featuredCount = comments.filter((item) => item.isFeatured).length;
  if (featuredCount !== 1) {
    let featuredAssigned = false;
    return comments.slice(0, 4).map((item) => {
      if (!featuredAssigned) {
        featuredAssigned = true;
        return { ...item, isFeatured: true };
      }
      return { ...item, isFeatured: false };
    });
  }

  return comments.slice(0, 4);
}

function buildSectorOrganicThreadExtras(input: {
  city: string;
  sectorKey: ForumSectorKey;
}): string[] {
  const city = input.city.trim() || "bölgede";

  if (input.sectorKey === "restaurant") {
    return [
      `${city}'de esnaf lokantası tarafına da bak kanka, ev yemeği sevenler için fiyatlar genelde daha makul.`,
      `Ana yemek siparişinde porsiyonlar yerden yere değişiyor, ilk gidişte paylaşarak denemek iyi olur.`,
      `Menüde günlük spesiyel varsa onu sor derim, taze çıkan ürünler genelde oradan geliyor.`,
    ];
  }

  if (input.sectorKey === "hotel") {
    return [
      `${city}'de butik otellerde kahvaltı genelde daha iyi, büyük otellerde oda kalitesi değişken olabiliyor.`,
      `Rezervasyon yaparken manzara tarafını özellikle sor, fotoğraflar bazen yanıltabiliyor.`,
      `Yaz sezonunda merkez oteller hızlı doluyor, birkaç gün önceden ayırtmak lazım.`,
    ];
  }

  return [
    `${city}'de tedavi öncesi mutlaka muayene yaptır derim, fiyat işletmeye göre ciddi oynuyor.`,
    `Randevu saatinde kısa bekleme olabilir ama hijyen ve alet sterilizasyonuna dikkat etmek şart.`,
    `Çocuk dişi için ayrı hekim olan klinikler daha rahat geçiyor, önceden sorup gitmek iyi olur.`,
  ];
}

export function buildForumThreadFallback(input: {
  question: string;
  brandName: string;
  city: string;
  sectorLabel: string;
  sectorKey: ForumSectorKey;
}): ForumThreadCommentDraft[] {
  const featured = buildForumAnswerFallback(input);
  const extras = buildSectorOrganicThreadExtras({
    city: input.city,
    sectorKey: input.sectorKey,
  });

  return [
    { content: featured, isFeatured: true },
    { content: extras[0]!, isFeatured: false },
    { content: extras[1]!, isFeatured: false },
    { content: extras[2]!, isFeatured: false },
  ];
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
