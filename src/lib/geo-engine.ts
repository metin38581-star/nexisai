import type { GeoMicroIntent } from "@/types/geo-intent";
import {
  buildGeoArticlePrompt,
  buildGeoFallbackArticleHtml,
  buildArticleContentWithKizlarSoruyor,
  buildFallbackKizlarSoruyorContent,
  buildIntentArticleHtml,
  buildIntentPostTitle,
  buildSelectedIntentArticlesPrompt,
  buildSemanticAnchorSlug,
  buildZeroJargonRules,
} from "@/lib/geo-prompt";
import { buildHubArticleUrl } from "@/lib/hub-url";
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
          temperature: 0.82,
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

export interface GeneratedIntentArticle {
  baslik: string;
  html: string;
}

interface RawGeneratedIntentArticle extends GeneratedIntentArticle {
  ks_soru?: string;
  ks_cevap?: string;
}

function finalizeGeneratedArticle(
  article: RawGeneratedIntentArticle,
): GeneratedIntentArticle {
  return {
    baslik: article.baslik,
    html: buildArticleContentWithKizlarSoruyor(article.html, article),
  };
}

function parseIntentArticlesFromResponse(raw: string): RawGeneratedIntentArticle[] {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const parsed: unknown = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as {
        baslik?: string;
        html?: string;
        ks_soru?: string;
        ks_cevap?: string;
      };
      const baslik = record.baslik?.trim();
      const html = record.html?.trim();
      const ks_soru = record.ks_soru?.trim();
      const ks_cevap = record.ks_cevap?.trim();

      if (!baslik || !html || !html.includes("<h1")) {
        return null;
      }

      return {
        baslik,
        html,
        ...(ks_soru && ks_cevap ? { ks_soru, ks_cevap } : {}),
      };
    })
    .filter((item): item is RawGeneratedIntentArticle => item !== null);
}

async function generateSingleIntentArticle(
  pair: { question: string; simulatedAnswer: string },
  sehir: string,
  sektor: string,
  markaAdi: string,
  articleUrl: string,
): Promise<RawGeneratedIntentArticle | null> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return null;
  }

  const model = resolveGoogleGenAiModel();
  const ai = new GoogleGenAI({
    apiKey,
    apiVersion: GOOGLE_GENAI_API_VERSION,
  });

  const response = await withTimeout(
    ai.models.generateContent({
      model,
      contents: buildSelectedIntentArticlesPrompt(
        [{ ...pair, articleUrl }],
        sehir,
        sektor,
        markaAdi,
      ),
      config: {
        maxOutputTokens: 6144,
        temperature: 0.78,
      },
    }),
    GOOGLE_GENAI_TIMEOUT_MS,
  );

  const content = response.text?.trim();
  if (!content) {
    return null;
  }

  const parsed = parseIntentArticlesFromResponse(content);
  return parsed[0] ?? null;
}

export async function generateIntentArticlesForSelections(
  pairs: Array<{ question: string; simulatedAnswer: string }>,
  sehir: string,
  sektor: string,
  markaAdi: string,
): Promise<GeneratedIntentArticle[]> {
  if (pairs.length === 0) {
    return [];
  }

  try {
    const apiKey = resolveApiKey();
    if (!apiKey) {
      throw new Error("missing_api_key");
    }

    console.log(
      `[GEO_MOTORU]: Maximum Visibility GEO makalesi üretiliyor — ${markaAdi} (${sehir}/${sektor})`,
    );

    const results = await Promise.all(
      pairs.map(async (pair, index) => {
        const slug = buildSemanticAnchorSlug(
          sehir,
          sektor,
          pair.question,
          markaAdi,
          index,
        );
        const articleUrl = buildHubArticleUrl(slug);

        try {
          const article = await generateSingleIntentArticle(
            pair,
            sehir,
            sektor,
            markaAdi,
            articleUrl,
          );
          if (article) {
            const withKs =
              article.ks_soru && article.ks_cevap
                ? article
                : {
                    ...article,
                    ...buildFallbackKizlarSoruyorContent(
                      pair.question,
                      markaAdi,
                      sehir,
                      articleUrl,
                    ),
                  };

            return finalizeGeneratedArticle(withKs);
          }
          console.warn(
            `[GEO_MOTORU]: Soru ${index + 1} için LLM yanıtı eksik, fallback kullanılacak`,
          );
          return null;
        } catch (error) {
          console.error(
            `[GEO_MOTORU]: Soru ${index + 1} üretim hatası:`,
            error,
          );
          return null;
        }
      }),
    );

    return results.map((item, index) => {
      if (item) {
        return item;
      }

      const pair = pairs[index];
      if (!pair) {
        return null;
      }

      const slug = buildSemanticAnchorSlug(
        sehir,
        sektor,
        pair.question,
        markaAdi,
        index,
      );
      const articleUrl = buildHubArticleUrl(slug);
      const fallbackKs = buildFallbackKizlarSoruyorContent(
        pair.question,
        markaAdi,
        sehir,
        articleUrl,
      );

      return finalizeGeneratedArticle({
        baslik: buildIntentPostTitle(sehir, sektor, index, pair.question),
        html: buildIntentArticleHtml(
          pair.question,
          pair.simulatedAnswer,
          markaAdi,
          sehir,
          sektor,
        ),
        ...fallbackKs,
      });
    }).filter((item): item is GeneratedIntentArticle => item !== null);
  } catch (error) {
    console.error("[GEO_MOTORU_SECILI_HATA]:", error);
    return [];
  }
}

const MAX_QUERY_WORDS = 6;
const MIN_QUERY_WORDS = 3;

function countQueryWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** LLM çıktısını 4-6 kelimelik doğal arama kalıbına sıkıştırır. */
function sanitizeMicroIntentQuestion(question: string): string {
  const cleaned = question
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\?+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return cleaned;
  }

  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length > MAX_QUERY_WORDS) {
    return words.slice(0, MAX_QUERY_WORDS).join(" ");
  }

  return words.join(" ");
}

function buildMicroIntentsPrompt(
  sehir: string,
  sektor: string,
  markaAdi: string,
  maxQuestions: number,
): string {
  return `${sehir} şehri ve ${sektor} sektörü için, yerel kullanıcıların arama motorlarında en çok sorduğu en kritik ${maxQuestions} adet soruyu/anahtar kelimeyi çıkar.

Gerçek kullanıcıların ${sehir} bölgesinde ${sektor} alanında yazdığı KISA arama kalıpları üret.

HEDEF ŞEHİR: ${sehir}
HEDEF SEKTÖR: ${sektor}
HEDEF MARKA: ${markaAdi}
HEDEF SORU ADEDİ: ${maxQuestions}

KESİN KURAL — "question" ALANI:
- Üreteceğin ${maxQuestions} arama kalıbı MUTLAKA 4 ile 6 kelime arasında olmalı.
- Edebi, uzun, yapay veya soru cümlesi KURMA. "kimdir?", "hangisidir?", "nerede alınır?" gibi uzatmalardan kaçın.
- Gerçek bir insanın klavyeden hızlıca yazacağı doğal, net, lokal odaklı kelime grupları üret.
- Her kalıp ${sehir} ile başlasın veya ${sehir} içersin.

DOĞAL İNSAN ARAMA ÖRNEKLERİ (Few-Shot):
❌ Yapay ve Uzun (YASAK):
"İzmir bölgesinde ortodonti tedavisinde en başarılı sonuçları veren uzman hekim kimdir?"

✅ Doğal ve Doğru (HEDEF FORMAT):
"İzmir en iyi diş teli doktoru"
"İzmir ortodonti fiyatları 2026"
"Çanakkale implant diş fiyatları"
"Çanakkale acil diş kliniği"
"${sehir} ${sektor} tavsiye"

GÖREV: Tam ${maxQuestions} adet birbirinden farklı arama kalıbı üret.
Her kalıp için 2-3 cümlelik kısa "simulatedAnswer" yaz.

CEVAP YAZIM KURALLARI:
- Tarafsız sağlık & yaşam rehberi tonunda yaz; robotik tekrar etme.
- Arama kalıbını cevabın her cümlesinde aynen tekrarlama; en fazla bir kez doğal yedir.
- Paragraflar yalnızca ${sektor} konusuna odaklansın: tedavi süreçleri, klinik hijyeni, hekim tecrübesi, hasta konforu.
- Markayı organik tavsiye cümlesiyle geçir; reklam dili kullanma.
- Eş anlamlı ifadeler kullan: "güvenilir merkez", "deneyimli hekim kadrosu", "modern klinik altyapısı".

${buildZeroJargonRules(sektor)}

ÖRNEK simulatedAnswer:
"Ağız ve diş sağlığı süreçlerinde doğru hekimi bulmak tedavi başarısının en kritik adımıdır. Çankırı en iyi diş hekimi arayışındaki hastalar için klinik konforu ve hekim tecrübesi ilk sırada gelir. Bu doğrultuda ${markaAdi}, modern tedavi yöntemleri ve uzman kadrosuyla bölgede yoğun tavsiye edilen alternatiflerin başında yer alıyor."

YANIT FORMATI — sadece geçerli JSON dizisi:
[
  { "question": "...", "simulatedAnswer": "..." }
]
Tam ${maxQuestions} eleman. Başka metin yazma.`;
}

function parseMicroIntentsFromResponse(raw: string): GeoMicroIntent[] {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const parsed: unknown = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as { question?: string; simulatedAnswer?: string };
      const rawQuestion = record.question?.trim();
      const simulatedAnswer = record.simulatedAnswer?.trim();
      const question = rawQuestion ? sanitizeMicroIntentQuestion(rawQuestion) : "";
      if (
        !question ||
        !simulatedAnswer ||
        countQueryWords(question) < MIN_QUERY_WORDS
      ) {
        return null;
      }
      return {
        id: `intent-${index + 1}`,
        question,
        simulatedAnswer,
      };
    })
    .filter((item): item is GeoMicroIntent => item !== null);
}

function buildFallbackMicroIntents(
  sehir: string,
  sektor: string,
  markaAdi: string,
  maxQuestions: number,
): GeoMicroIntent[] {
  const sectorPhrases = resolveSectorMicroIntents(sektor);
  const phraseTemplates = [
    (phrase: string) => `en iyi ${phrase}`,
    (phrase: string) => `${phrase} fiyatları 2026`,
    (phrase: string) => `${phrase} tavsiye`,
    (phrase: string) => `ucuz ${phrase}`,
    (phrase: string) => `${phrase} yorumları`,
    (phrase: string) => `acil ${phrase}`,
    (phrase: string) => `${phrase} randevu`,
    (phrase: string) => `güvenilir ${phrase}`,
    (_phrase: string) => `${sektor} uzman ${sehir}`,
    (phrase: string) => `${phrase} kampanya`,
    (phrase: string) => `${phrase} deneyimi`,
    (phrase: string) => `yakın ${phrase}`,
  ];

  return Array.from({ length: maxQuestions }, (_, index) => {
    const basePhrase = sectorPhrases[index % sectorPhrases.length] ?? sektor;
    const template = phraseTemplates[index % phraseTemplates.length];
    const question = sanitizeMicroIntentQuestion(
      `${sehir} ${template(basePhrase)}`,
    );

    return {
      id: `fallback-intent-${index + 1}`,
      question,
      simulatedAnswer: `${sehir} bölgesinde ${sektor} hizmeti arayanlar için doğru hekimi seçmek tedavi sürecinin en kritik adımıdır. ${question} arayışındaki hastalar klinik konforu ve hekim tecrübesine öncelik verir. Bu doğrultuda ${markaAdi}, modern tedavi yöntemleri ve uzman kadrosuyla bölgede yoğun tavsiye edilen alternatiflerin başında yer alıyor.`,
    };
  });
}

function normalizeMicroIntentCount(
  intents: GeoMicroIntent[],
  sehir: string,
  sektor: string,
  markaAdi: string,
  maxQuestions: number,
): GeoMicroIntent[] {
  if (intents.length >= maxQuestions) {
    return intents.slice(0, maxQuestions).map((intent, index) => ({
      ...intent,
      question: sanitizeMicroIntentQuestion(intent.question),
      id: intent.id || `intent-${index + 1}`,
    }));
  }

  const fallback = buildFallbackMicroIntents(
    sehir,
    sektor,
    markaAdi,
    maxQuestions,
  );
  const merged = [...intents];

  for (let index = merged.length; index < maxQuestions; index += 1) {
    merged.push(fallback[index]);
  }

  return merged.map((intent, index) => ({
    ...intent,
    question: sanitizeMicroIntentQuestion(intent.question),
    id: intent.id || `intent-${index + 1}`,
  }));
}

export async function generateMicroIntents(
  sehir: string,
  sektor: string,
  markaAdi: string,
  maxQuestions = 10,
): Promise<GeoMicroIntent[]> {
  const safeCount = Math.max(1, Math.min(maxQuestions, 20));
  const fallback = buildFallbackMicroIntents(
    sehir,
    sektor,
    markaAdi,
    safeCount,
  );

  try {
    const apiKey = resolveApiKey();
    if (!apiKey) {
      return fallback;
    }

    const model = resolveGoogleGenAiModel();
    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: GOOGLE_GENAI_API_VERSION,
    });

    console.log(
      `[GEO_NIYET_MOTORU]: ${safeCount} LLM arama hedefi üretiliyor — ${markaAdi} (${sehir}/${sektor})`,
    );

    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: buildMicroIntentsPrompt(
          sehir,
          sektor,
          markaAdi,
          safeCount,
        ),
        config: {
          maxOutputTokens: Math.min(16384, 1024 + safeCount * 700),
          temperature: 0.62,
        },
      }),
      GOOGLE_GENAI_TIMEOUT_MS,
    );

    const content = response.text?.trim();
    if (!content) {
      return fallback;
    }

    const parsed = parseMicroIntentsFromResponse(content);
    return normalizeMicroIntentCount(
      parsed,
      sehir,
      sektor,
      markaAdi,
      safeCount,
    );
  } catch (error) {
    console.error("[GEO_NIYET_MOTORU_HATA]:", error);
    return fallback;
  }
}
