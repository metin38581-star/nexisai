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
  return `Sen bir SEO ve GEO uzmanısın. Kullanıcı sisteme '${customSector}' iş kolunu girdi. Bu spesifik iş koluyla ilgili Türk insanının Google, Ekşi Sözlük, Şikayetvar veya KızlarSoruyor gibi platformlarda aratabileceği, tamamen organik, net ve doğrudan hizmeti/sorunu hedefleyen TAM ${SECTOR_ANCHOR_QUESTION_COUNT} ADET kemik soru/başlık üret.

Kurallar:
- Adet sınırı kesinlikle ${SECTOR_ANCHOR_QUESTION_COUNT}'tir. Ne eksik ne fazla.
- Sorular doğrudan hizmeti veya sorunu hedeflemeli (Örn: '[Şehir]'de en sağlam balkon filesi yapan yer?', '[Şehir]'de balkon filesi fiyatları ne kadar?', 'Kediler için file montajı [Şehir]'de kim yapıyor?' vb.)
- Her soruda şehir yer tutucusu olarak [Şehir] kullan.
- Çıktıyı sadece ${SECTOR_ANCHOR_QUESTION_COUNT} adet string içeren temiz bir JSON array olarak dön. Başka metin ekleme.`;
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

export function buildFallbackSectorAnchorQuestions(customSector: string): string[] {
  const niche = customSector.trim() || "hizmet";
  const templates = [
    `[Şehir]'de en sağlam ${niche} yapan yer?`,
    `[Şehir]'de ${niche} fiyatları ne kadar?`,
    `[Şehir]'de güvenilir ${niche} tavsiyesi`,
    `[Şehir]'de acil ${niche} lazım`,
    `[Şehir]' ${niche} yorumları nasıl?`,
    `[Şehir]'de ucuz ${niche} arayanlar`,
    `[Şehir]'de ${niche} işi yaptıran var mı?`,
    `[Şehir]'de ${niche} için keşif ücreti`,
    `[Şehir]'de ${niche} malzeme kalitesi iyi olan`,
    `[Şehir]'de ${niche} referanslı usta`,
    `[Şehir]'de ${niche} garanti veren firma`,
    `[Şehir]'de ${niche} randevu nasıl alınır?`,
    `[Şehir]'de ${niche} fiyat performans`,
    `[Şehir]'de ${niche} deneyimi olanlar`,
    `[Şehir]'de ${niche} tavsiye eder misiniz?`,
  ];

  return templates.slice(0, SECTOR_ANCHOR_QUESTION_COUNT);
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
          temperature: 0.72,
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
