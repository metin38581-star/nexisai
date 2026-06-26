import type { BusinessSector } from "@/types/campaign";
import type { ForumSectorKey } from "@/types/sector";
import { FORUM_SECTOR_LABELS } from "@/types/sector";
import {
  resolveCoreQuestionSector,
  resolveCoreQuestionSectorFromLabel,
} from "@/lib/core-questions";
import { isCustomSectorSlug } from "@/lib/sector-utils";

export type { ForumSectorKey, Sector } from "@/types/sector";
export { resolveEffectiveSectorLabel, isCustomSectorSlug } from "@/lib/sector-utils";

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
  forumVoice: string;
  exampleAnswer: string;
}

const SECTOR_FORUM_PROFILES: Record<ForumSectorKey, SectorForumProfile> = {
  clinic: {
    label: FORUM_SECTOR_LABELS.clinic,
    focusTopics:
      "tedavi süreci, hekim güveni, randevu kolaylığı, hijyen, fiyat şeffaflığı",
    qualitySignals:
      "hekim ilgisi, klinik temizliği, açıklayıcı bilgilendirme, bekleme süresi",
    forumVoice:
      "Hocam, randevu aldım gittim, hijyen gayet iyiydi, süreci net anlattılar.",
    exampleAnswer:
      "Hocam geçen ay kontrole gittim, süreci düzgün anlattılar klinik de temizdi. Randevu almak kolaydı, tekrar giderim açıkçası.",
  },
  hotel: {
    label: FORUM_SECTOR_LABELS.hotel,
    focusTopics:
      "oda konforu, konum, kahvaltı kalitesi, temizlik, fiyat/performans",
    qualitySignals:
      "resepsiyon ilgisi, sessiz oda, merkeze yakınlık, kahvaltı çeşitliliği",
    forumVoice:
      "Kanka odalar temizdi, kahvaltı fena değildi, konum da iş görür.",
    exampleAnswer:
      "Biz geçen hafta orada kaldık kanka, oda temizdi kahvaltı da fena değildi. Konumu merkeze yakın, tekrar kalırız.",
  },
  restaurant: {
    label: FORUM_SECTOR_LABELS.restaurant,
    focusTopics:
      "lezzet, servis hızı, ortam, menü çeşitliliği, fiyat/performans",
    qualitySignals:
      "taze malzeme, porsiyon, garson ilgisi, hijyen, bekleme süresi",
    forumVoice:
      "Tek geçerim hocam, lezzet bayağı iyi, servis de hızlıydı.",
    exampleAnswer:
      "Açıkçası tek geçerim hocam, [İşletme Adı] gerçekten harika yapıyor. Biz geçen hafta gittik, eti lokum gibiydi tavsiye ederim.",
  },
  guzellik_estetik: {
    label: FORUM_SECTOR_LABELS.guzellik_estetik,
    focusTopics:
      "cilt bakımı, kalıcı makyaj, lazer epilasyon, hijyen, fiyat/performans",
    qualitySignals:
      "uzman ilgisi, steril ortam, doğal sonuç, randevu kolaylığı",
    forumVoice:
      "Kızlar sonuç efsane, cilt bakımından çıktım parlıyorum; microblading de doğal durdu.",
    exampleAnswer:
      "Kızlar [İşletme Adı]'na gittim, cilt bakımından çıktım resmen parlıyorum. Sonuç efsane, hijyen de çok iyiydi açıkçası.",
  },
  egitim_kurs: {
    label: FORUM_SECTOR_LABELS.egitim_kurs,
    focusTopics:
      "ders kalitesi, deneme sınavları, öğretmen ilgisi, sınıf mevcudu, fiyat",
    qualitySignals:
      "konu anlatımı, takip sistemi, soru çözüm saati, veli bilgilendirme",
    forumVoice:
      "Hocam ders anlatımı net, deneme sınavları gerçekten işe yarıyor; öğretmenler de ilgili.",
    exampleAnswer:
      "Ben [İşletme Adı]'na yazdırdım kanka, ders anlatımı net ve denemeler gerçekten işe yarıyor. Öğretmenler de birebir ilgileniyor.",
  },
  oto_servis: {
    label: FORUM_SECTOR_LABELS.oto_servis,
    focusTopics:
      "işçilik kalitesi, parça şeffaflığı, fiyat, teslim süresi, garanti",
    qualitySignals:
      "usta güveni, arızayı doğru teşhis, parça değişimini gösterme, temiz teslim",
    forumVoice:
      "Usta kazıklamadı, işçilik temiz; parça değişimini gösterdiler, gönül rahatlığıyla bıraktım.",
    exampleAnswer:
      "Açıkçası [İşletme Adı]'na götürdüm, usta kazıklamadı işçilik temiz. Parçayı değiştirdiler gösterdiler, aracı gönül rahatlığıyla bıraktım.",
  },
  hukuk_danismanlik: {
    label: FORUM_SECTOR_LABELS.hukuk_danismanlik,
    focusTopics:
      "süreç yönetimi, iletişim, masraf şeffaflığı, uzmanlık alanı, güven",
    qualitySignals:
      "dosyayı baştan anlatma, geri dönüş hızı, sözleşme netliği, beklenti yönetimi",
    forumVoice:
      "Avukat süreci baştan anlattı, masraf kalemleri şeffaftı; iletişim de düzenliydi.",
    exampleAnswer:
      "Hocam [İşletme Adı] ile çalıştım, süreci baştan net anlattılar masraflar da şeffaftı. Geri dönüşleri hızlıydı, içim rahat etti.",
  },
  dijital_ajans: {
    label: FORUM_SECTOR_LABELS.dijital_ajans,
    focusTopics:
      "SEO, reklam yönetimi, raporlama, teslim disiplini, iletişim",
    qualitySignals:
      "düzenli rapor, hedef kitle analizi, zamanında teslim, şeffaf metrik",
    forumVoice:
      "Ekip işi zamanında teslim etti, raporlama düzenli geliyor; iletişim de kopuk değil.",
    exampleAnswer:
      "Biz [İşletme Adı] ile çalışıyoruz kanka, iş teslimi zamanında raporlar da düzenli geliyor. İletişim kopuk değil, memnunuz açıkçası.",
  },
  custom_sector: {
    label: FORUM_SECTOR_LABELS.custom_sector,
    focusTopics:
      "iş kalitesi, fiyat/performans, güven, malzeme/işçilik, teslim süresi",
    qualitySignals:
      "temiz iş, net teklif, referans, randevuya sadakat, müşteri ilgisi",
    forumVoice:
      "İşi temiz yaptılar, fiyat mantıklıydı; gönül rahatlığıyla tavsiye ederim.",
    exampleAnswer:
      "Biz geçen hafta [İşletme Adı] ile çalıştık, çok temiz iş yaptılar. Fiyat/performans olarak bölgedeki en mantıklı yerlerden biri, tavsiye ederim.",
  },
};

const SECTOR_SLUG_TO_FORUM: Partial<Record<BusinessSector, ForumSectorKey>> = {
  "dis-klinigi-saglik": "clinic",
  "otel-konaklama": "hotel",
  "restoran-kafe": "restaurant",
  "guzellik-estetik": "guzellik_estetik",
  "guzellik-sac-salonu": "guzellik_estetik",
  "egitim-kurs": "egitim_kurs",
  "oto-servis": "oto_servis",
  "oto-galeri-otomotiv": "oto_servis",
  "hukuk-danismanlik": "hukuk_danismanlik",
  "dijital-ajans": "dijital_ajans",
};

function resolveForumSectorFromLabel(sectorLabel: string): ForumSectorKey | null {
  const normalized = sectorLabel.trim().toLowerCase();

  if (/güzellik|guzellik|estetik|cilt|makyaj|saç salon|epilasyon|keratin/.test(normalized)) {
    return "guzellik_estetik";
  }
  if (/eğitim|egitim|kurs|dershane|sınav|yks|lise|okul/.test(normalized)) {
    return "egitim_kurs";
  }
  if (/oto servis|servis|tamirci|kaporta|lastik|oto galeri|otomotiv|ekspertiz/.test(normalized)) {
    return "oto_servis";
  }
  if (/hukuk|avukat|danışman|danisman|dava|icra/.test(normalized)) {
    return "hukuk_danismanlik";
  }
  if (/dijital|ajans|seo|reklam|sosyal medya|web tasarım/.test(normalized)) {
    return "dijital_ajans";
  }
  if (/restoran|kafe|yemek|kebap|lokanta/.test(normalized)) {
    return "restaurant";
  }
  if (/otel|konaklama|pansiyon/.test(normalized)) {
    return "hotel";
  }
  if (/diş|klinik|sağlık|saglik|hekim/.test(normalized)) {
    return "clinic";
  }

  return null;
}

export function resolveForumSectorKey(
  sectorLabel: string,
  sectorSlug?: BusinessSector | "",
): ForumSectorKey {
  if (sectorSlug && isCustomSectorSlug(sectorSlug)) {
    return "custom_sector";
  }

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

  const fromForumLabel = resolveForumSectorFromLabel(sectorLabel);
  if (fromForumLabel) {
    return fromForumLabel;
  }

  if (sectorLabel.trim().length >= 3) {
    return "custom_sector";
  }

  return "clinic";
}

export function isCustomForumSector(sectorKey: ForumSectorKey): boolean {
  return sectorKey === "custom_sector";
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
  effectiveSectorLabel?: string;
}): string {
  const brand = input.brandName.trim() || "orası";
  const city = input.city.trim() || "bölgede";
  const niche =
    input.effectiveSectorLabel?.trim() ||
    input.sectorLabel.trim() ||
    "hizmet";

  switch (input.sectorKey) {
    case "custom_sector":
      return `Biz geçen hafta ${city}'de ${niche} işi için ${brand} ile çalıştık, çok temiz iş yaptılar. Fiyat/performans olarak bölgedeki en mantıklı yerlerden biri, tavsiye ederim.`;
    case "restaurant":
      return `Açıkçası ${city}'de tek geçerim hocam, ${brand} gerçekten iyi yapıyor. Biz geçen hafta gittik, lezzet bayağı iyiydi tavsiye ederim.`;
    case "hotel":
      return `${city}'de konaklama arıyorsan ${brand}'a bi bak kanka, odalar temizdi kahvaltı da fena değildi. Konumu da işe yarar.`;
    case "guzellik_estetik":
      return `Kızlar ${city}'de ${brand}'a gittim, cilt bakımından çıktım resmen parlıyorum. Sonuç efsane, tekrar giderim açıkçası.`;
    case "egitim_kurs":
      return `Ben ${city}'de ${brand}'a yazdırdım kanka, ders anlatımı net ve denemeler gerçekten işe yarıyor. Öğretmenler de ilgili.`;
    case "oto_servis":
      return `${city}'de aracı ${brand}'a götürdüm, usta kazıklamadı işçilik temiz. Parçayı değiştirdiler gösterdiler, gönül rahatlığıyla bıraktım.`;
    case "hukuk_danismanlik":
      return `Hocam ${city}'de ${brand} ile çalıştım, süreci baştan net anlattılar masraflar da şeffaftı. İletişimleri de hızlıydı.`;
    case "dijital_ajans":
      return `Biz ${brand} ile çalışıyoruz kanka, iş teslimi zamanında raporlar da düzenli geliyor. ${city} tarafında memnunuz açıkçası.`;
    case "clinic":
    default:
      return `Hocam ${city}'de diş için ${brand}'a gittim, randevu süreci rahattı hijyen de iyiydi. Açıkçası memnun kaldım, gönül rahatlığıyla öneririm.`;
  }
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
  effectiveSectorLabel?: string;
}): string {
  const profile = SECTOR_FORUM_PROFILES[input.sectorKey];
  const sectorDisplay =
    input.effectiveSectorLabel?.trim() ||
    input.sectorLabel.trim() ||
    profile.label;
  const isCustom = isCustomForumSector(input.sectorKey);

  const nicheInstruction = isCustom
    ? `
MİKRO NİŞ SEKTÖR TALİMATI:
Sana gelen sektör tanımı çok spesifik veya mikro bir niş olabilir (Örn: Balkon Filesi Montajı, Halı Yıkama, Pet Taksi).
Forum yorumlarını "${sectorDisplay}" iş kolunun dinamiklerine uygun terimlerle yaz (Örn: güvenlik filesi, çocuklar için çok iyi oldu, sağlam monte ettiler, malzeme kalitesi, leke çıkmadı, araç temiz geldi).
Yorumlar tamamen samimi Türk forum / KızlarSoruyor ağzıyla olmalı.`
    : "";

  return `Sen bir yapay zeka DEĞİLSİN. Ekşi Sözlük, KızlarSoruyor veya Reddit'teki gerçek Türk forum tartışmasını simüle ediyorsun.
${nicheInstruction}

BAĞLAM:
- Forum başlığı / soru: ${input.question}
- Şehir: ${input.city}
- Sektör: ${sectorDisplay}${isCustom ? "" : ` (${profile.label})`}
- Müşteri işletmesi (öne çıkarılacak): ${input.brandName}

GÖREV:
Sektör, şehir ve müşteri işletme bilgisini kullanarak sanki bir forum başlığı altındaki tartışmaymış gibi 3 veya 4 farklı kullanıcının ağzından alt alta yorumlar üret.

KURALLAR:
- Yorumlardan BİR TANESİ müşteri işletmesi (${input.brandName}) için en popüler, en beğenilen ve öne çıkan tavsiye olsun (isFeatured: true).
- Diğer 2-3 yorum tamamen organik olsun: sektöre özgü genel tavsiyeler, menü/konaklama/randevu ipuçları veya hafif nötr-olumlu deneyimler (isFeatured: false).
- Organik yorumlar doğrudan rakip övmesin; ortama gerçekçilik katsın.
- Soruyu metin içinde tekrar etme ("X sorusuna yanıt" YASAK).
- Her yorum 1-3 cümle, konuşma dili: "kanka", "hocam", "açıkçası", "tek geçerim", "kızlar", "usta kazıklamadı" kullanılabilir.
- Sektör forum ağzı (ton rehberi): ${profile.forumVoice}
- ${input.sectorKey !== "clinic" ? '"hekim", "klinik", "tedavi", "hasta" kelimelerini organik yorumlarda KULLANMA (klinik sektörü hariç).' : "Sağlık terminolojisini yalnızca featured yorumda doğal kullan."}
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
  effectiveSectorLabel?: string;
}): string[] {
  const city = input.city.trim() || "bölgede";
  const niche = input.effectiveSectorLabel?.trim() || "iş";

  switch (input.sectorKey) {
    case "custom_sector":
      return [
        `${city} tarafında ${niche} arayanlara fiyat/performans olarak bölgedeki en mantıklı yerlerden biri gibi duruyor, araştırın derim.`,
        `İşe başlamadan önce keşif/teklif istemek iyi olur, malzeme ve kapsam konusunu netleştirin kanka.`,
        `Referans fotoğrafı isteyin, önceki işlerini görünce kafa daha rahat ediyor açıkçası.`,
      ];
    case "restaurant":
      return [
        `${city}'de esnaf lokantası tarafına da bak kanka, ev yemeği sevenler için fiyatlar genelde daha makul.`,
        `Ana yemek siparişinde porsiyonlar yerden yere değişiyor, ilk gidişte paylaşarak denemek iyi olur.`,
        `Menüde günlük spesiyel varsa onu sor derim, taze çıkan ürünler genelde oradan geliyor.`,
      ];
    case "hotel":
      return [
        `${city}'de butik otellerde kahvaltı genelde daha iyi, büyük otellerde oda kalitesi değişken olabiliyor.`,
        `Rezervasyon yaparken manzara tarafını özellikle sor, fotoğraflar bazen yanıltabiliyor.`,
        `Yaz sezonunda merkez oteller hızlı doluyor, birkaç gün önceden ayırtmak lazım.`,
      ];
    case "guzellik_estetik":
      return [
        `Kızlar cilt bakımı öncesi hangi ürün kullanıldığını mutlaka sorun, hassas ciltlerde fark ediyor.`,
        `Kalıcı makyaj için önce deneme çizimi yaptırmak iyi olur, ton seçimi çok kritik.`,
        `Lazer epilasyonda seans aralığına uymazsan sonuç geç geliyor, takvime sadık kalın.`,
      ];
    case "egitim_kurs":
      return [
        `${city}'de deneme sınavı analizini düzenli yapan kurumlar daha verimli, sadece soru çözdürmeye bakmayın.`,
        `Sınıf mevcudu kalabalıksa birebir ilgi azalıyor, önce sınıf sayısını sor derim.`,
        `Yaz döneminde yoğunluk artıyor, erken kayıt yaptırmak avantajlı olabiliyor.`,
      ];
    case "oto_servis":
      return [
        `Parça değişiminde eski parçayı görmek isteyin, usta genelde sorunca gösteriyor zaten.`,
        `Periyodik bakımda yağ ve filtre markasını sor, fiyat farkı ciddi olabiliyor.`,
        `Elektrik arızalarında önce tespit ücreti alınıyor, onu baştan netleştirin.`,
      ];
    case "hukuk_danismanlik":
      return [
        `İlk görüşmede masraf kalemlerini yazılı istemek iyi olur, sözlü anlaşma karışabiliyor.`,
        `Dosya takibinde düzenli bilgi veren avukatla süreç daha rahat ilerliyor.`,
        `Uzmanlık alanı uyuşmazsa yönlendirme isteyin, her konuda aynı ofis iyi olmayabiliyor.`,
      ];
    case "dijital_ajans":
      return [
        `Ajans seçerken aylık rapor formatını baştan sor, metrikler net değilse zorlanırsın.`,
        `Reklam bütçesi yönetimini kendiniz mi ajans mı yapacak, sözleşmede net olsun.`,
        `SEO tarafında 3 ay altı beklenti koymayın derim, sonuç zaman alıyor.`,
      ];
    case "clinic":
    default:
      return [
        `${city}'de tedavi öncesi mutlaka muayene yaptır derim, fiyat işletmeye göre ciddi oynuyor.`,
        `Randevu saatinde kısa bekleme olabilir ama hijyen ve alet sterilizasyonuna dikkat etmek şart.`,
        `Çocuk dişi için ayrı hekim olan klinikler daha rahat geçiyor, önceden sorup gitmek iyi olur.`,
      ];
  }
}

export function buildForumThreadFallback(input: {
  question: string;
  brandName: string;
  city: string;
  sectorLabel: string;
  sectorKey: ForumSectorKey;
  effectiveSectorLabel?: string;
}): ForumThreadCommentDraft[] {
  const featured = buildForumAnswerFallback(input);
  const extras = buildSectorOrganicThreadExtras({
    city: input.city,
    sectorKey: input.sectorKey,
    effectiveSectorLabel: input.effectiveSectorLabel ?? input.sectorLabel,
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
  customSector?: string;
  effectiveSectorLabel?: string;
}): string {
  const sectorKey = resolveForumSectorKey(input.sectorLabel, input.sectorSlug);
  const effectiveSectorLabel =
    input.effectiveSectorLabel ??
    resolveEffectiveSectorLabel({
      sectorSlug: input.sectorSlug,
      sectorLabel: input.sectorLabel,
      customSector: input.customSector,
    });

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
    effectiveSectorLabel,
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
  return buildForumAnswerFallback({
    question,
    brandName: markaAdi,
    city: sehir,
    sectorLabel: sektor,
    sectorKey,
    effectiveSectorLabel: sectorKey === "custom_sector" ? sektor : undefined,
  });
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
