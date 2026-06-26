import "server-only";

import { GoogleGenAI } from "@google/genai";

import { QUESTIONS_PER_SECTOR } from "@/constants/campaign";

const SECTOR_ANCHOR_QUESTION_COUNT = QUESTIONS_PER_SECTOR;

const DEFAULT_GOOGLE_GENAI_MODEL = "gemini-2.5-flash";
const GOOGLE_GENAI_API_VERSION = "v1";
const SECTOR_ANCHOR_TIMEOUT_MS = 45_000;

function resolveApiKey(): string | null {
  return (
    process.env.GOOGLE_GENAI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    null
  );
}

function resolveGoogleGenAiModel(): string {
  return process.env.GOOGLE_GENAI_MODEL?.trim() || DEFAULT_GOOGLE_GENAI_MODEL;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("sector_anchor_timeout"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function buildSectorAnchorQuestionsPrompt(customSector: string): string {
  return `Sen bir SEO ve dikey arama uzmanısın. Kullanıcı sisteme '${customSector}' niş kategorisini girdi.
Bu niş sektöre özel, Türk insanının internette (Google, Forumlar, Şikayetvar) GERÇEKTEN kurabileceği ${SECTOR_ANCHOR_QUESTION_COUNT} adet popüler ve birbirinden tamamen farklı soru/başlık üret.

Her sektörün dinamiği kendine hastır; kelime değiştirme şablonları KESİNLİKLE YASAKTIR. Aynı cümle iskeletini tekrarlama, "en sağlam X yapan yer", "X keşif ücreti", "X garanti veren firma" gibi jenerik kalıpları kullanma.

Sektör dinamiğini '${customSector}' ifadesinden kendin çıkar. Aşağıdaki maddeler yalnızca düşünme yönü içindir — çıktıda birebir kopyalama:
- Balkon filesi / file montajı gibi yapısal hizmetlerde: montaj kalitesi, kedi ve çocuk güvenliği, çelik misina, yırtılma, rüzgara dayanım, balkon ölçüsüne göre fiyat gibi teknik konulara odaklan.
- Pet taksi / evcil hayvan taşıma gibi ulaştırma hizmetlerinde: 7/24 erişim, şehirler arası taşıma, büyük ırk kabulü, hijyen, güvenli taşıma kafesi, stres yönetimi gibi hayvan ve lojistik odaklı konulara odaklan.
- Diğer nişlerde: o iş kolunun müşterisinin gerçekten merak ettiği, forumda soracağı spesifik problemleri hedefle; sektör jargonunu doğal kullan.

Kurallar:
- Tam ${SECTOR_ANCHOR_QUESTION_COUNT} adet soru üret; ne eksik ne fazla.
- Her soru özgün olsun; anlam ve yapı olarak birbirinin kopyası olmasın.
- Şehir bağlamı doğal geliyorsa [Şehir] yer tutucusunu kullan; her soruda zorunlu değil.
- Sorular kısa, net, arama ve forum diliyle uyumlu olsun.

Çıktıyı yalnızca ${SECTOR_ANCHOR_QUESTION_COUNT} adet benzersiz, özgün string içeren temiz bir JSON array olarak dön. Başka metin ekleme.`;
}

function detectSectorFallbackProfile(customSector: string): "balkon_file" | "pet_taksi" | "generic" {
  const normalized = customSector.trim().toLocaleLowerCase("tr-TR");

  if (/file|filesi|balkon/.test(normalized)) {
    return "balkon_file";
  }

  if (/pet|evcil|hayvan|taksi|taşıma|tasima|kedi|köpek|kopek/.test(normalized)) {
    return "pet_taksi";
  }

  return "generic";
}

export function buildFallbackSectorAnchorQuestions(customSector: string): string[] {
  const niche = customSector.trim() || "hizmet";
  const profile = detectSectorFallbackProfile(niche);

  if (profile === "balkon_file") {
    return [
      "Kediler için balkona file yaptırmak güvenli mi?",
      "Kopmayan balkon filesi fiyatları ne kadar?",
      "[Şehir]'de çocuk emniyetli balkon filesi montajı yapan var mı?",
      "Çelik misinalı balkon filesi mi plastik file mi daha dayanıklı?",
      "Balkon filesi rüzgarda yırtılır mı, hangi marka iyi?",
      "[Şehir]'de balkon file montajı kaç günde biter?",
      "Apartman yönetimi balkon filesine izin verir mi?",
      "Kuşlar için ince file mi kalın file mi tercih edilmeli?",
      "[Şehir]'de balkon file ölçüsü nasıl alınır?",
      "File montajında vida mı kanca mı daha sağlam?",
      "Balkon filesi fiyatı metrekareye göre mi hesaplanır?",
      "[Şehir]'de file sökümü ve yenileme yapan usta arayanlar",
      "Cam balkona file yaptıranlar memnun mu?",
      "Balkon filesi UV dayanımı önemli mi?",
      "[Şehir]'de file montajı sonrası kontrol servisi veren yerler",
    ].slice(0, SECTOR_ANCHOR_QUESTION_COUNT);
  }

  if (profile === "pet_taksi") {
    return [
      "Şehirler arası pet taksi fiyatları ne kadar?",
      "Gece açık acil pet taksi var mı?",
      "Büyük ırk köpek taşıyan pet taksi tavsiyesi",
      "[Şehir]'den [Şehir]'ye kedi taşıma nasıl yapılır?",
      "Pet takside kafeste hayvan stresi nasıl azaltılır?",
      "Havalimanı pet taksi hizmeti veren firmalar",
      "[Şehir]'de 7/24 evcil hayvan taşıma",
      "Pet taksi mi veteriner nakil aracı mı farkı ne?",
      "Kedi taşıma kutusu pet takside gerekli mi?",
      "[Şehir]'de hijyenik pet taksi yorumları",
      "Şehir içi köpek taşıma ücreti neye göre belirlenir?",
      "Pet taksi randevusu ne kadar önceden alınmalı?",
      "Hamile kedi taşımak için güvenli pet taksi arayanlar",
      "[Şehir]'de kuş taşıyan pet taksi var mı?",
      "Pet taksi sigortası olan firmalar hangileri?",
    ].slice(0, SECTOR_ANCHOR_QUESTION_COUNT);
  }

  return [
    `${niche} hakkında [Şehir]'de en çok sorulan sorular neler?`,
    `${niche} yaptırmadan önce nelere dikkat etmeli?`,
    `[Şehir]'de ${niche} arayanlar deneyimlerini nerede paylaşıyor?`,
    `${niche} fiyatları neden bu kadar değişiyor?`,
    `İlk kez ${niche} hizmeti alacaklar için tavsiyeler`,
    `[Şehir]'de ${niche} konusunda dolandırılmamak için ne yapmalı?`,
    `${niche} işinde malzeme kalitesi nasıl anlaşılır?`,
    `[Şehir]'de ${niche} için randevu almak zor mu?`,
    `${niche} sonrası bakım veya garanti süreci nasıl işler?`,
    `Acil ${niche} ihtiyacı olanlar ne yapmalı?`,
    `[Şehir]'de ${niche} yorumlarına güvenilir mi?`,
    `${niche} seçerken referans istemek normal mi?`,
    `[Şehir]'de ${niche} yapan küçük esnaf mı firma mı?`,
    `${niche} hizmetinde gizli masraf çıkar mı?`,
    `[Şehir]'de ${niche} konusunda forum tavsiyeleri`,
  ].slice(0, SECTOR_ANCHOR_QUESTION_COUNT);
}

function parseQuestionsFromResponse(raw: string): string[] {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const parsed: unknown = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter((item) => item.length >= 8);
}

function normalizeAnchorQuestionCount(
  questions: string[],
  customSector: string,
): string[] {
  const fallback = buildFallbackSectorAnchorQuestions(customSector);
  const merged = [...questions];

  for (let index = merged.length; index < SECTOR_ANCHOR_QUESTION_COUNT; index += 1) {
    merged.push(fallback[index] ?? fallback[fallback.length - 1]!);
  }

  return merged.slice(0, SECTOR_ANCHOR_QUESTION_COUNT);
}

export async function generateSectorAnchorQuestions(
  customSector: string,
): Promise<string[]> {
  const niche = customSector.trim();
  const fallback = buildFallbackSectorAnchorQuestions(niche);

  if (!niche) {
    return fallback;
  }

  try {
    const apiKey = resolveApiKey();
    if (!apiKey) {
      console.warn(
        "[SEKTOR_KEMIK_SORU]: API anahtari yok — sablon fallback kullaniliyor.",
      );
      return fallback;
    }

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: GOOGLE_GENAI_API_VERSION,
    });

    console.log(
      `[SEKTOR_KEMIK_SORU]: ${SECTOR_ANCHOR_QUESTION_COUNT} kemik soru uretiliyor — "${niche}"`,
    );

    const response = await withTimeout(
      ai.models.generateContent({
        model: resolveGoogleGenAiModel(),
        contents: buildSectorAnchorQuestionsPrompt(niche),
        config: {
          maxOutputTokens: 4096,
          temperature: 0.88,
          responseMimeType: "application/json",
        },
      }),
      SECTOR_ANCHOR_TIMEOUT_MS,
    );

    const content = response.text?.trim();
    if (!content) {
      return fallback;
    }

    const parsed = parseQuestionsFromResponse(content);
    if (parsed.length === 0) {
      return fallback;
    }

    return normalizeAnchorQuestionCount(parsed, niche);
  } catch (error) {
    console.error("[SEKTOR_KEMIK_SORU_HATA]:", error);
    return fallback;
  }
}
