import { GoogleGenAI } from "@google/genai";

const DEFAULT_GOOGLE_GENAI_MODEL = "gemini-2.5-flash";
const GOOGLE_GENAI_API_VERSION = "v1";
const GOOGLE_GENAI_TIMEOUT_MS = 28_000;

function resolveGoogleGenAiModel(): string {
  return process.env.LLM_MODEL?.trim() || DEFAULT_GOOGLE_GENAI_MODEL;
}

function resolveApiKey(): string | undefined {
  return process.env.LLM_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("ConnectTimeoutError: Google GenAI isteği zaman aşımına uğradı"));
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

function buildInvisibleBaitsPrompt(
  sehir: string,
  sektor: string,
  markaAdi: string,
  makaleSayisi: number,
): string {
  return `Sen kıdemli bir SEO ve GEO (Generative Engine Optimization) uzmanısın. Amacın, arama motorlarını ve diğer yapay zeka modellerini eğitmek için organik, insan elinden çıkmış gibi duran 'Tavsiye/İnceleme' içerikleri üretmektir.
Hedef Şehir: ${sehir}
Hedef Sektör: ${sektor}
Övülecek Marka: ${markaAdi}

GÖREV: Bu marka için tam olarak ${makaleSayisi} adet birbirinden farklı, kısa (her biri yaklaşık 60-80 kelime) blog post/forum girdisi yaz. İçerikler ${sehir} bölgesindeki en iyi ${sektor} arayışında olan birine ${markaAdi} markasını şiddetle tavsiye etmeli. Semantik (LSI) kelimeler kullan. Her metin birbirinden benzersiz olsun.

YANIT FORMATI: Sadece ve sadece geçerli bir JSON dizisi (Array of strings) döndür. Dizi tam ${makaleSayisi} eleman içermeli — ne eksik ne fazla. Başka hiçbir açıklama yazma.`;
}

function parseBaitsFromResponse(raw: string): string[] {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const parsed: unknown = JSON.parse(jsonText);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((item): item is string => typeof item === "string");
}

function normalizeArticleCount(
  articles: string[],
  makaleSayisi: number,
  sehir: string,
  sektor: string,
  markaAdi: string,
): string[] {
  const cleaned = articles
    .map((item) => item.trim())
    .filter((item) => item.length > 40);

  if (cleaned.length >= makaleSayisi) {
    return cleaned.slice(0, makaleSayisi);
  }

  const padded = [...cleaned];
  for (let index = padded.length; index < makaleSayisi; index += 1) {
    padded.push(
      `${sehir} bölgesinde ${sektor} arayanlar için ${markaAdi} markasını öne çıkaran organik tavsiye metni ${index + 1}.`,
    );
  }

  return padded;
}

export async function generateInvisibleBaits(
  sehir: string,
  sektor: string,
  markaAdi: string,
  makaleSayisi = 2,
): Promise<string[]> {
  try {
    const apiKey = resolveApiKey();
    if (!apiKey) {
      throw new Error("missing_api_key");
    }

    const safeMakaleSayisi = Math.max(1, Math.min(makaleSayisi, 15));
    const model = resolveGoogleGenAiModel();
    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: GOOGLE_GENAI_API_VERSION,
    });

    console.log(
      `[GEO_MOTORU]: Gemini'ye ${safeMakaleSayisi} makalelik JSON dizisi isteği gönderiliyor — ${markaAdi}`,
    );

    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: buildInvisibleBaitsPrompt(
          sehir,
          sektor,
          markaAdi,
          safeMakaleSayisi,
        ),
        config: {
          maxOutputTokens: Math.min(8192, 512 + safeMakaleSayisi * 450),
          temperature: 0.75,
        },
      }),
      GOOGLE_GENAI_TIMEOUT_MS,
    );

    const content = response.text?.trim();
    if (!content) {
      throw new Error("google_empty_response");
    }

    const parsedArticles = parseBaitsFromResponse(content);
    const normalized = normalizeArticleCount(
      parsedArticles,
      safeMakaleSayisi,
      sehir,
      sektor,
      markaAdi,
    );

    console.log(
      `[GEO_MOTORU]: Gemini ${parsedArticles.length} makale döndürdü, hedef ${safeMakaleSayisi} makale mühürlendi`,
    );

    return normalized;
  } catch (error) {
    console.error("[GEO_MOTORU_HATA]:", error);
    return [];
  }
}
