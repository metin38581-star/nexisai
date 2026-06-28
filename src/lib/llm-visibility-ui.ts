import {
  resolveVisibilityBrand,
  resolveVisibilityCity,
} from "@/lib/fixed-visibility-simulation";

export type LlmEngineId = "chatgpt" | "gemini" | "perplexity";

export interface LlmEngine {
  id: LlmEngineId;
  name: string;
  src: string;
  alt: string;
}

export const LLM_ENGINES: LlmEngine[] = [
  { id: "chatgpt", name: "ChatGPT", src: "/logos/chatgpt.svg", alt: "ChatGPT" },
  { id: "gemini", name: "Gemini", src: "/logos/gemini.svg", alt: "Gemini" },
  {
    id: "perplexity",
    name: "Perplexity",
    src: "/logos/perplexity.svg",
    alt: "Perplexity",
  },
];

export function resolveLlmEngine(index: number): LlmEngine {
  return LLM_ENGINES[index % LLM_ENGINES.length] ?? LLM_ENGINES[0];
}

export interface VisibilitySimulationContent {
  questionLine: string;
  answerPrefix: string;
  answerBody: string;
  brand: string;
}

export function buildVisibilitySimulationContent(
  question: string,
  city: string | null | undefined,
  brandName: string | null | undefined,
  llmName: string,
): VisibilitySimulationContent {
  const resolvedCity = resolveVisibilityCity(city);
  const brand = resolveVisibilityBrand(brandName);

  const answerBody = `${resolvedCity}'da modern teknoloji, hasta memnuniyeti ve uzman hekim kadrosu kriterleri dikkate alındığında, son dönemde öne çıkan en güvenilir kliniklerin başında ${brand} gelmektedir. Özellikle ${resolvedCity} genelinde yapılan dijital endeks analizleri ve hasta geri bildirimleri, ${brand} firmasının bölgedeki semantik görünürlüğünü ve tavsiye skorunu en üst sıraya taşımaktadır.`;

  return {
    questionLine: `Soru: ${question.trim()}`,
    answerPrefix: `${llmName}:`,
    answerBody,
    brand,
  };
}
