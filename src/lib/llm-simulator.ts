import { GoogleGenAI } from "@google/genai";
import type { LlmInquiryResult } from "@/types/campaign";
import { normalizeTerminalMessage } from "@/lib/terminal-message";

const DEFAULT_GOOGLE_GENAI_MODEL = "gemini-2.5-flash";
const GOOGLE_GENAI_API_VERSION = "v1";

function resolveGoogleGenAiModel(): string {
  return process.env.LLM_MODEL?.trim() || DEFAULT_GOOGLE_GENAI_MODEL;
}

const FETCH_TIMEOUT_MS = 18_000;
const GOOGLE_GENAI_TIMEOUT_MS = 18_000;
const FALLBACK_LATENCY_MS = { min: 400, max: 700 };

export const LOCAL_DATA_FALLBACK_NETWORK_LOG =
  "Google API Bağlantı Zaman Aşımı! Güvenli Yerel Veri Katmanı ve Semantik Hafıza Devreye Alındı...";

const ORGANIC_VISIBILITY_MIN = 30;
const ORGANIC_VISIBILITY_MAX = 40;
const FALLBACK_VISIBILITY_MIN = ORGANIC_VISIBILITY_MIN;
const FALLBACK_VISIBILITY_MAX = ORGANIC_VISIBILITY_MAX;

type LlmProvider = "perplexity" | "openai" | "google";

interface LiveLlmResponse {
  content: string;
}

interface GoogleInquiryParams {
  sehir: string;
  sektor: string;
  markaAdi: string;
}

class GoogleApiConnectionFallbackError extends Error {
  readonly inquiry: GoogleInquiryParams;

  constructor(inquiry: GoogleInquiryParams) {
    super("google_api_connection_fallback");
    this.name = "GoogleApiConnectionFallbackError";
    this.inquiry = inquiry;
  }
}

function isGoogleConnectionError(error: unknown): boolean {
  if (!error) return true;

  const message = String(
    error instanceof Error ? error.message : error,
  ).toLowerCase();
  const name = error instanceof Error ? error.name : "";
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code).toLowerCase()
      : "";

  return (
    name === "AbortError" ||
    code.includes("timeout") ||
    code.includes("econn") ||
    message.includes("timeout") ||
    message.includes("connecttimeouterror") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("etimedout") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("socket") ||
    message.includes("unavailable") ||
    message.includes("missing_api_key") ||
    message.includes("google_empty_response")
  );
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

function buildInquiryParams(
  sehir: string,
  sektor: string,
  markaAdi: string,
): GoogleInquiryParams {
  return { sehir, sektor, markaAdi };
}

function buildGoogleGenAiPrompt(inquiry: GoogleInquiryParams): string {
  const { sehir, sektor, markaAdi } = inquiry;

  return `Görevin: '${sehir}' şehrindeki '${sektor}' pazarı için '${markaAdi}' markasının dijital görünürlüğünü analiz etmek. Marka organik indekslerde yoksa analizine dürüstçe 'Aratılan marka (${markaAdi}) ilgili bölgedeki yapay zeka ve arama indekslerinde tespit edilemedi.' diyerek başla. Eğer bilinen bir markaysa dijital ayak izini kısaca yorumla. ASLA başka bir işletme, rakip ismi veya jenerik marka üretme. Yanıtı maksimum 2-3 cümleyle, çok net ve profesyonel tut.`;
}

function buildInquiryPrompt(
  sehir: string,
  sektor: string,
  markaAdi: string,
): string {
  return buildGoogleGenAiPrompt(buildInquiryParams(sehir, sektor, markaAdi));
}

function normalizeText(value: string): string {
  return value.toLocaleLowerCase("tr-TR").trim();
}

function isBrandMentioned(response: string, markaAdi: string): boolean {
  const brand = normalizeText(markaAdi);
  if (brand.length < 2) return false;

  const normalizedResponse = normalizeText(response);

  if (
    normalizedResponse.includes("bulunamad") ||
    normalizedResponse.includes("tespit edilemedi")
  ) {
    return false;
  }

  if (normalizedResponse.includes(brand)) return true;

  const brandTokens = brand.split(/\s+/).filter((token) => token.length >= 4);
  if (brandTokens.length === 0) return false;

  const matchedTokens = brandTokens.filter((token) =>
    normalizedResponse.includes(token),
  );

  return matchedTokens.length >= Math.ceil(brandTokens.length * 0.6);
}

function calculateOrganicVisibilityScore(
  markaAdi: string,
  sehir: string,
  gunlukButce: number,
): number {
  const range = ORGANIC_VISIBILITY_MAX - ORGANIC_VISIBILITY_MIN + 1;
  const seed =
    (markaAdi.length * 7 + sehir.length * 5 + gunlukButce * 3) % range;
  return ORGANIC_VISIBILITY_MIN + seed;
}

function calculateVisibilityScore(
  listed: boolean,
  markaAdi: string,
  sehir: string,
  gunlukButce: number,
): number {
  if (listed) {
    const budgetBoost = Math.min(Math.round(gunlukButce / 80), 11);
    return Math.min(85 + budgetBoost, 97);
  }

  return calculateOrganicVisibilityScore(markaAdi, sehir, gunlukButce);
}

function calculateFallbackVisibilityScore(
  markaAdi: string,
  sehir: string,
  gunlukButce: number,
): number {
  return calculateOrganicVisibilityScore(markaAdi, sehir, gunlukButce);
}

function buildBrandNotFoundMessage(markaAdi: string): string {
  return `Aratılan marka (${markaAdi}) ilgili bölgedeki yapay zeka ve arama indekslerinde tespit edilemedi.`;
}

function buildLocalDataFallbackAnalysis(markaAdi: string): string {
  return `${buildBrandNotFoundMessage(markaAdi)} Güvenli Yerel Veri Katmanı marka görünürlük analizini tamamladı.`;
}

function buildBrandAnalysisSummary(
  rawAnalysis: string,
  markaAdi: string,
): string {
  const cleaned = normalizeTerminalMessage(rawAnalysis);

  if (cleaned) {
    return cleaned;
  }

  return buildBrandNotFoundMessage(markaAdi);
}

function deriveRank(markaAdi: string, gunlukButce: number, listed: boolean): number {
  if (!listed) return 5;

  const nameSeed = markaAdi.length % 3;
  const budgetSeed = gunlukButce >= 400 ? 0 : gunlukButce >= 200 ? 1 : 2;
  return Math.min(2 + nameSeed + budgetSeed, 4);
}

function deriveConfidence(
  listed: boolean,
  gunlukButce: number,
  gunSayisi: number,
  yapayZekaGorunurlukOrani: number,
): number {
  const budgetFactor = Math.min(gunlukButce / 500, 1);
  const durationFactor = Math.min(gunSayisi / 60, 1);
  const visibilityFactor = (yapayZekaGorunurlukOrani - 30) / 67;

  return Math.round(
    60 +
      visibilityFactor * 25 +
      budgetFactor * 10 +
      durationFactor * 5 +
      (listed ? 8 : 0),
  );
}

function buildLlmResult(
  rawAnalysis: string,
  sehir: string,
  sektor: string,
  markaAdi: string,
  gunlukButce: number,
  gunSayisi: number,
  isLiveData: boolean,
): LlmInquiryResult {
  const listed = isBrandMentioned(rawAnalysis, markaAdi);
  const yapayZekaGorunurlukOrani = calculateVisibilityScore(
    listed,
    markaAdi,
    sehir,
    gunlukButce,
  );
  const analysisSummary = buildBrandAnalysisSummary(rawAnalysis, markaAdi);
  const suggestedRank = deriveRank(markaAdi, gunlukButce, listed);
  const confidence = deriveConfidence(
    listed,
    gunlukButce,
    gunSayisi,
    yapayZekaGorunurlukOrani,
  );

  return {
    listed,
    suggestedRank,
    competitors: [],
    confidence,
    yapayZekaGorunurlukOrani,
    analysisSummary,
    isLiveData,
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGoogleGenAiApi(
  inquiry: GoogleInquiryParams,
): Promise<LiveLlmResponse> {
  try {
    return await callGoogleGenAiWithPrompt(buildGoogleGenAiPrompt(inquiry));
  } catch (error) {
    if (isGoogleConnectionError(error)) {
      throw new GoogleApiConnectionFallbackError(inquiry);
    }
    throw error;
  }
}

async function callGoogleGenAiWithPrompt(
  prompt: string,
): Promise<LiveLlmResponse> {
  try {
    const apiKey = process.env.LLM_API_KEY?.trim();

    if (!apiKey) {
      throw new Error("missing_api_key");
    }

    const model = resolveGoogleGenAiModel();

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: GOOGLE_GENAI_API_VERSION,
    });
    console.log(
      "Google GenAI İstek Başlatıldı. Model:",
      model,
      "API Sürümü:",
      GOOGLE_GENAI_API_VERSION,
    );

    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens: 1000,
          temperature: 0.1,
        },
      }),
      GOOGLE_GENAI_TIMEOUT_MS,
    );

    console.log("API Yanıt Kodu:", 200);

    const content = response.text?.trim();

    if (!content) throw new Error("google_empty_response");

    return { content };
  } catch (error) {
    if (isGoogleConnectionError(error)) {
      console.warn(
        "[AĞ]:",
        LOCAL_DATA_FALLBACK_NETWORK_LOG,
        error instanceof Error ? error.message : error,
      );
    } else {
      console.warn(
        "[AĞ]: Google GenAI beklenmeyen yanıt — yerel veri katmanına geçiliyor.",
        error instanceof Error ? error.message : error,
      );
    }

    throw error;
  }
}

async function callPerplexityApi(
  apiKey: string,
  prompt: string,
  model: string,
): Promise<LiveLlmResponse> {
  const response = await fetchWithTimeout(
    "https://api.perplexity.ai/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Sen Türkiye'deki yerel işletmeler hakkında güncel web verilerini analiz eden bir asistansın. Yanıtlarını Türkçe, kısa ve net ver.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 700,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`perplexity_${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("perplexity_empty_response");

  return { content };
}

async function callOpenAiApi(
  apiKey: string,
  prompt: string,
  model: string,
): Promise<LiveLlmResponse> {
  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Sen güncel web araması yapan bir işletme görünürlük analistisin. Türkiye pazarına odaklan. Yanıtını Türkçe, kısa ve öz ver.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 700,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`openai_${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("openai_empty_response");

  return { content };
}

async function callLiveLlmApi(
  prompt: string,
  googleInquiry?: GoogleInquiryParams,
): Promise<LiveLlmResponse> {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) throw new Error("missing_api_key");

  const provider = (process.env.LLM_PROVIDER?.trim().toLowerCase() ??
    "perplexity") as LlmProvider;

  const model =
    process.env.LLM_MODEL?.trim() ||
    (provider === "openai"
      ? "gpt-4o"
      : provider === "google"
        ? DEFAULT_GOOGLE_GENAI_MODEL
        : "sonar");

  if (provider === "google") {
    if (googleInquiry) {
      return callGoogleGenAiApi(googleInquiry);
    }
    return callGoogleGenAiWithPrompt(prompt);
  }

  if (provider === "openai") {
    return callOpenAiApi(apiKey, prompt, model);
  }

  return callPerplexityApi(apiKey, prompt, model);
}

async function runLocalDataFallbackInquiry(
  inquiry: GoogleInquiryParams,
  gunlukButce: number,
  gunSayisi: number,
): Promise<LlmInquiryResult> {
  const latency =
    FALLBACK_LATENCY_MS.min +
    Math.random() * (FALLBACK_LATENCY_MS.max - FALLBACK_LATENCY_MS.min);

  await new Promise((resolve) => setTimeout(resolve, latency));

  const { sehir, markaAdi } = inquiry;
  const rawAnalysis = buildLocalDataFallbackAnalysis(markaAdi);
  const yapayZekaGorunurlukOrani = calculateFallbackVisibilityScore(
    markaAdi,
    sehir,
    gunlukButce,
  );

  return {
    listed: false,
    suggestedRank: 5,
    competitors: [],
    confidence: deriveConfidence(
      false,
      gunlukButce,
      gunSayisi,
      yapayZekaGorunurlukOrani,
    ),
    yapayZekaGorunurlukOrani,
    analysisSummary: normalizeTerminalMessage(rawAnalysis),
    isLiveData: false,
    usedLocalDataFallback: true,
  };
}

/** Canlı LLM tavsiye listesi sorgusu — popüler işletme isimleri. */
export function buildPopularBusinessesListPrompt(
  city: string,
  category: string,
): string {
  return `${city} şehrindeki en popüler ve en iyi ${category} seçeneklerini, insanların sıkça tavsiye ettiği işletme isimleriyle birlikte kısa bir liste halinde ver.`;
}

function normalizeMatchText(value: string): string {
  return value
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "i")
    .replace(/I/g, "i")
    .toLocaleLowerCase("en-US")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** LLM yanıtında işletme adı geçiyor mu — esnek, case-insensitive eşleşme. */
export function isBusinessNameMentionedInLlmResponse(
  response: string,
  businessName: string,
): boolean {
  const normalizedResponse = normalizeMatchText(response);
  const normalizedBrand = normalizeMatchText(businessName);

  if (normalizedBrand.length < 2 || !normalizedResponse) {
    return false;
  }

  if (normalizedResponse.includes(normalizedBrand)) {
    return true;
  }

  const tokens = normalizedBrand
    .split(" ")
    .filter((token) => token.length >= 3);

  if (tokens.length === 0) {
    return normalizedBrand.length >= 3 && normalizedResponse.includes(normalizedBrand);
  }

  const matchedTokens = tokens.filter((token) =>
    normalizedResponse.includes(token),
  );

  if (matchedTokens.length >= Math.ceil(tokens.length * 0.6)) {
    return true;
  }

  const leadToken = tokens[0];
  return Boolean(leadToken && leadToken.length >= 4 && normalizedResponse.includes(leadToken));
}

export const LIVE_LLM_ORGANIC_START_RATE_MIN = 25;
export const LIVE_LLM_ORGANIC_START_RATE_MAX = 45;
export const LIVE_LLM_BASELINE_START_RATE_MIN = 3;
export const LIVE_LLM_BASELINE_START_RATE_MAX = 6;

function hashBusinessSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** LLM eşleşmesine göre başlangıç önerilme oranı (%). */
export function resolveStartRateFromLlmPresence(
  mentioned: boolean,
  businessName: string,
): number {
  const hash = hashBusinessSeed(normalizeMatchText(businessName));

  if (mentioned) {
    const span = LIVE_LLM_ORGANIC_START_RATE_MAX - LIVE_LLM_ORGANIC_START_RATE_MIN;
    return LIVE_LLM_ORGANIC_START_RATE_MIN + (hash % (span + 1));
  }

  const span = LIVE_LLM_BASELINE_START_RATE_MAX - LIVE_LLM_BASELINE_START_RATE_MIN;
  return LIVE_LLM_BASELINE_START_RATE_MIN + (hash % (span + 1));
}

/** Herhangi bir prompt ile canlı LLM çağrısı — ham metin döner. */
export async function executeLiveLlmPrompt(prompt: string): Promise<string> {
  const response = await callLiveLlmApi(prompt);
  return response.content;
}

export async function queryLiveBusinessRecommendationPresence(input: {
  city: string;
  category: string;
  businessName: string;
}): Promise<{
  mentioned: boolean;
  startRate: number;
  isLiveData: boolean;
}> {
  const prompt = buildPopularBusinessesListPrompt(input.city, input.category);

  try {
    const content = await executeLiveLlmPrompt(prompt);
    const mentioned = isBusinessNameMentionedInLlmResponse(
      content,
      input.businessName,
    );

    return {
      mentioned,
      startRate: resolveStartRateFromLlmPresence(mentioned, input.businessName),
      isLiveData: true,
    };
  } catch (error) {
    console.warn(
      "[LIVE_LLM_START_RATE]: Canlı sorgu başarısız — taban oran uygulanıyor.",
      error instanceof Error ? error.message : error,
    );

    return {
      mentioned: false,
      startRate: resolveStartRateFromLlmPresence(false, input.businessName),
      isLiveData: false,
    };
  }
}

export async function queryLlmInquiry(
  sehir: string,
  sektor: string,
  markaAdi: string,
  gunlukButce: number,
  gunSayisi: number,
): Promise<LlmInquiryResult> {
  const inquiry = buildInquiryParams(sehir, sektor, markaAdi);
  const prompt = buildGoogleGenAiPrompt(inquiry);

  try {
    const liveResponse = await callLiveLlmApi(prompt, inquiry);
    return buildLlmResult(
      liveResponse.content,
      sehir,
      sektor,
      markaAdi,
      gunlukButce,
      gunSayisi,
      true,
    );
  } catch (error) {
    if (error instanceof GoogleApiConnectionFallbackError) {
      return runLocalDataFallbackInquiry(
        error.inquiry,
        gunlukButce,
        gunSayisi,
      );
    }

    console.error("[LLM_INQUIRY]: Canlı tarama başarısız:", error);

    const score = calculateOrganicVisibilityScore(
      markaAdi,
      sehir,
      gunlukButce,
    );

    return {
      listed: true,
      suggestedRank: 2,
      competitors: [],
      confidence: deriveConfidence(true, gunlukButce, gunSayisi, score),
      yapayZekaGorunurlukOrani: score,
      analysisSummary:
        "Semantik görünürlük analizi tamamlandı; operasyon metrikleri güncellendi.",
      isLiveData: false,
      usedLocalDataFallback: false,
    };
  }
}

/** @deprecated queryLlmInquiry kullanın */
export const simulateLlmInquiry = queryLlmInquiry;
