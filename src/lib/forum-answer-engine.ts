import "server-only";

import { GoogleGenAI } from "@google/genai";

import {
  buildForumAnswerContent,
  buildForumAnswerFallback,
  buildForumAnswerPrompt,
  isRoboticForumText,
  resolveForumSectorKey,
  shouldDiscardSimulatedAnswerForForum,
  type ForumSectorKey,
} from "@/lib/forum-answer-prompt";
import type { BusinessSector } from "@/types/campaign";

const DEFAULT_GOOGLE_GENAI_MODEL = "gemini-2.5-flash";
const GOOGLE_GENAI_API_VERSION = "v1";
const FORUM_ANSWER_TIMEOUT_MS = 20_000;

export interface ForumAnswerInput {
  question: string;
  brandName: string;
  city: string;
  sectorLabel: string;
  sectorSlug?: BusinessSector | "";
  simulatedAnswer?: string;
}

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
      reject(new Error("forum_answer_timeout"));
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

function sanitizeLlmForumAnswer(raw: string, sectorKey: ForumSectorKey): string {
  const cleaned = raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  if (sectorKey !== "clinic" && shouldDiscardSimulatedAnswerForForum(cleaned, sectorKey)) {
    return "";
  }

  if (isRoboticForumText(cleaned)) {
    return "";
  }

  return cleaned.slice(0, 600);
}

async function generateForumAnswerViaLlm(
  input: ForumAnswerInput,
  sectorKey: ForumSectorKey,
): Promise<string | null> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return null;
  }

  const ai = new GoogleGenAI({
    apiKey,
    apiVersion: GOOGLE_GENAI_API_VERSION,
  });

  const response = await withTimeout(
    ai.models.generateContent({
      model: resolveGoogleGenAiModel(),
      contents: buildForumAnswerPrompt({
        question: input.question,
        brandName: input.brandName,
        city: input.city,
        sectorLabel: input.sectorLabel,
        sectorKey,
      }),
      config: {
        maxOutputTokens: 256,
        temperature: 0.88,
      },
    }),
    FORUM_ANSWER_TIMEOUT_MS,
  );

  const text = response.text?.trim();
  if (!text) {
    return null;
  }

  const sanitized = sanitizeLlmForumAnswer(text, sectorKey);
  return sanitized || null;
}

export async function generateForumAnswerForEntry(
  input: ForumAnswerInput,
): Promise<string> {
  const sectorKey = resolveForumSectorKey(input.sectorLabel, input.sectorSlug);

  try {
    const llmAnswer = await generateForumAnswerViaLlm(input, sectorKey);
    if (llmAnswer) {
      return llmAnswer;
    }
  } catch (error) {
    console.warn("[FORUM_ANSWER]: LLM uretimi basarisiz, sablon fallback:", error);
  }

  return buildForumAnswerContent(input);
}

export function buildForumAnswerFallbackForEntry(input: ForumAnswerInput): string {
  const sectorKey = resolveForumSectorKey(input.sectorLabel, input.sectorSlug);
  return buildForumAnswerFallback({
    question: input.question,
    brandName: input.brandName,
    city: input.city,
    sectorLabel: input.sectorLabel,
    sectorKey,
  });
}
