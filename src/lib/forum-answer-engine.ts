import "server-only";

import { GoogleGenAI } from "@google/genai";

import {
  buildForumAnswerContent,
  buildForumThreadFallback,
  buildForumThreadPrompt,
  parseForumThreadComments,
  resolveForumSectorKey,
  type ForumThreadCommentDraft,
} from "@/lib/forum-answer-prompt";
import { generateForumUsername } from "@/lib/forum-username";
import type { BusinessSector } from "@/types/campaign";

const DEFAULT_GOOGLE_GENAI_MODEL = "gemini-2.5-flash";
const GOOGLE_GENAI_API_VERSION = "v1";
const FORUM_THREAD_TIMEOUT_MS = 30_000;

export interface ForumAnswerInput {
  question: string;
  brandName: string;
  city: string;
  sectorLabel: string;
  sectorSlug?: BusinessSector | "";
  simulatedAnswer?: string;
  seedKey?: string;
}

export interface ForumThreadComment {
  username: string;
  content: string;
  isFeatured: boolean;
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
      reject(new Error("forum_thread_timeout"));
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

function assignUsernamesToThread(
  drafts: ForumThreadCommentDraft[],
  seedKey: string,
): ForumThreadComment[] {
  return drafts.map((draft, index) => ({
    username: generateForumUsername(`${seedKey}-thread-${index}`),
    content: draft.content,
    isFeatured: draft.isFeatured,
  }));
}

async function generateForumThreadViaLlm(
  input: ForumAnswerInput,
  sectorKey: ReturnType<typeof resolveForumSectorKey>,
): Promise<ForumThreadCommentDraft[] | null> {
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
      contents: buildForumThreadPrompt({
        question: input.question,
        brandName: input.brandName,
        city: input.city,
        sectorLabel: input.sectorLabel,
        sectorKey,
      }),
      config: {
        maxOutputTokens: 1024,
        temperature: 0.88,
        responseMimeType: "application/json",
      },
    }),
    FORUM_THREAD_TIMEOUT_MS,
  );

  const text = response.text?.trim();
  if (!text) {
    return null;
  }

  const parsed = parseForumThreadComments(text, sectorKey);
  if (parsed.length >= 3) {
    return parsed;
  }

  console.warn(
    "[FORUM_ANSWER]: LLM JSON parse yetersiz, ham yanit:",
    text.slice(0, 240),
  );
  return null;
}

export async function generateForumThreadForEntry(
  input: ForumAnswerInput,
): Promise<ForumThreadComment[]> {
  const sectorKey = resolveForumSectorKey(input.sectorLabel, input.sectorSlug);
  const seedKey =
    input.seedKey ??
    `${input.brandName}-${input.city}-${input.question}`.slice(0, 120);

  try {
    const llmThread = await generateForumThreadViaLlm(input, sectorKey);
    if (llmThread) {
      return assignUsernamesToThread(llmThread, seedKey);
    }
  } catch (error) {
    console.warn("[FORUM_ANSWER]: LLM thread uretimi basarisiz, sablon fallback:", error);
  }

  const fallbackThread = buildForumThreadFallback({
    question: input.question,
    brandName: input.brandName,
    city: input.city,
    sectorLabel: input.sectorLabel,
    sectorKey,
  });

  return assignUsernamesToThread(fallbackThread, seedKey);
}

/** Tek yorum — geriye dönük uyumluluk */
export async function generateForumAnswerForEntry(
  input: ForumAnswerInput,
): Promise<string> {
  const thread = await generateForumThreadForEntry(input);
  const featured =
    thread.find((comment) => comment.isFeatured) ?? thread[0];

  if (featured?.content) {
    return featured.content;
  }

  return buildForumAnswerContent(input);
}

export function buildForumAnswerFallbackForEntry(input: ForumAnswerInput): string {
  const thread = buildForumThreadFallback({
    question: input.question,
    brandName: input.brandName,
    city: input.city,
    sectorLabel: input.sectorLabel,
    sectorKey: resolveForumSectorKey(input.sectorLabel, input.sectorSlug),
  });

  return thread.find((item) => item.isFeatured)?.content ?? thread[0]?.content ?? "";
}
