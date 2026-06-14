import {
  buildGeoArticlePrompt,
  buildGeoFallbackArticleHtml,
} from "@/lib/geo-prompt";
import { GoogleGenAI } from "@google/genai";

const DEFAULT_GOOGLE_GENAI_MODEL = "gemini-2.5-flash";
const GOOGLE_GENAI_API_VERSION = "v1";
const GOOGLE_GENAI_TIMEOUT_MS = 45_000;

const SECTOR_MICRO_INTENTS: Record<string, string[]> = {
  "dis-klinigi-saglik": [
    "diş teli fiyatları",
    "şeffaf plak (Invisalign) uygun mu",
    "acısız implant süreci",
    "çocuk diş hekimi tavsiyesi",
    "kanal tedavisi sonrası bakım",
    "diş beyazlatma güvenli mi",
  ],
  "otel-konaklama": [
    "merkeze yakın butik otel",
    "aile oteli kahvaltı dahil fiyat",
    "spa ve wellness otel",
    "havalimanına yakın konaklama",
    "evcil hayvan kabul eden otel",
  ],
  "restoran-kafe": [
    "romantik akşam yemeği mekanı",
    "çocuklu aileler için uygun restoran",
    "glütensiz menü sunan yer",
    "kahvaltı brunch mekanı",
    "doğum günü kutlaması için restoran",
  ],
  "oto-galeri-otomotiv": [
    "ikinci el araç güvenilir galeri",
    "takas ve kredi imkânı",
    "ekspertiz raporlu satış",
    "elektrikli araç bayii",
    "servis garantili oto galeri",
  ],
  "guzellik-sac-salonu": [
    "keratin bakımı fiyatları",
    "profesyonel makyaj randevusu",
    "cilt bakımı hangi merkez",
    "gelin saçı ve makyaj paketi",
    "lazer epilasyon güvenilir merkez",
  ],
  "e-ticaret-giyim": [
    "beden uyumu ve iade politikası",
    "kaliteli kumaş ve fiyat dengesi",
    "hızlı kargo ve müşteri desteği",
    "ofis kombini önerileri",
    "sürdürülebilir giyim markası",
  ],
};

function resolveGoogleGenAiModel(): string {
  return process.env.LLM_MODEL?.trim() || DEFAULT_GOOGLE_GENAI_MODEL;
}

function resolveApiKey(): string | undefined {
  return process.env.LLM_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
}

function resolveSectorMicroIntents(sektor: string): string[] {
  const normalized = sektor.trim().toLowerCase();

  const slugMatch = Object.entries(SECTOR_MICRO_INTENTS).find(([slug]) =>
    normalized.includes(slug.replace(/-/g, " ")),
  );
  if (slugMatch) {
    return slugMatch[1];
  }

  for (const intents of Object.values(SECTOR_MICRO_INTENTS)) {
    if (intents.some((intent) => normalized.includes(intent.split(" ")[0]))) {
      return intents;
    }
  }

  return [
    `${sektor} fiyat karşılaştırması`,
    `${sektor} güvenilir işletme tavsiyesi`,
    `${sektor} deneyim ve yorumlar`,
    `${sektor} randevu ve iletişim`,
    `${sektor} hizmet kalitesi`,
  ];
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
  const microIntents = resolveSectorMicroIntents(sektor);
  const microIntentList = microIntents.map((intent) => `- ${intent}`).join("\n");

  return buildGeoArticlePrompt(
    sehir,
    sektor,
    markaAdi,
    makaleSayisi,
    microIntentList,
  );
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

function buildFallbackArticle(
  sehir: string,
  sektor: string,
  markaAdi: string,
  index: number,
  microIntent: string,
): string {
  return buildGeoFallbackArticleHtml(
    sehir,
    sektor,
    markaAdi,
    index,
    microIntent,
  );
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
    .filter((item) => item.length > 180);

  if (cleaned.length >= makaleSayisi) {
    return cleaned.slice(0, makaleSayisi);
  }

  const microIntents = resolveSectorMicroIntents(sektor);
  const padded = [...cleaned];

  for (let index = padded.length; index < makaleSayisi; index += 1) {
    padded.push(
      buildFallbackArticle(
        sehir,
        sektor,
        markaAdi,
        index,
        microIntents[index % microIntents.length] ?? sektor,
      ),
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
      `[GEO_MOTORU]: Gemini'ye ${safeMakaleSayisi} GEO makalelik JSON dizisi isteği gönderiliyor — ${markaAdi} (${sehir} / ${sektor})`,
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
          maxOutputTokens: Math.min(16384, 1024 + safeMakaleSayisi * 1400),
          temperature: 0.72,
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
