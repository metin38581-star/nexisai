import "server-only";

import type { MarketIntelligenceEntry } from "@/types/market-intelligence";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasDatabaseUrl } from "@/lib/server-env";

export const MARKET_INTELLIGENCE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function isCacheFresh(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() < MARKET_INTELLIGENCE_TTL_MS;
}

function parseQuestions(value: unknown): MarketIntelligenceEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as { question?: string; simulatedAnswer?: string };
      const question = record.question?.trim();
      const simulatedAnswer = record.simulatedAnswer?.trim();
      if (!question || !simulatedAnswer) {
        return null;
      }
      return { question, simulatedAnswer };
    })
    .filter((item): item is MarketIntelligenceEntry => item !== null);
}

export function personalizeCachedAnswer(
  answer: string,
  markaAdi: string,
): string {
  return answer
    .replace(/\{\{BRAND\}\}/gi, markaAdi)
    .replace(/\[İŞLETME ADI\]/gi, markaAdi)
    .replace(/\[İŞLETME\]/gi, markaAdi);
}

export function brandToCachePlaceholder(answer: string, markaAdi: string): string {
  if (!markaAdi.trim()) {
    return answer;
  }
  return answer.split(markaAdi).join("{{BRAND}}");
}

async function getCachedViaPrisma(
  sector: string,
  city: string,
): Promise<{ questions: MarketIntelligenceEntry[]; updatedAt: Date } | null> {
  const row = await prisma.marketIntelligence.findUnique({
    where: {
      sector_city: {
        sector: normalizeKey(sector),
        city: normalizeKey(city),
      },
    },
  });

  if (!row) {
    return null;
  }

  return {
    questions: parseQuestions(row.questions),
    updatedAt: row.updatedAt,
  };
}

async function getCachedViaSupabase(
  sector: string,
  city: string,
): Promise<{ questions: MarketIntelligenceEntry[]; updatedAt: Date } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("MarketIntelligence")
    .select("questions, updatedAt")
    .eq("sector", normalizeKey(sector))
    .eq("city", normalizeKey(city))
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    questions: parseQuestions(data.questions),
    updatedAt: new Date(data.updatedAt as string),
  };
}

export async function getFreshMarketIntelligence(
  sector: string,
  city: string,
): Promise<MarketIntelligenceEntry[] | null> {
  try {
    let cached: { questions: MarketIntelligenceEntry[]; updatedAt: Date } | null =
      null;

    if (hasDatabaseUrl()) {
      try {
        cached = await getCachedViaPrisma(sector, city);
      } catch (error) {
        console.error("API Hatası:", error);
      }
    }

    if (!cached) {
      cached = await getCachedViaSupabase(sector, city);
    }

    if (!cached || !isCacheFresh(cached.updatedAt)) {
      return null;
    }

    return cached.questions;
  } catch (error) {
    console.error("API Hatası:", error);
    return null;
  }
}

async function upsertViaPrisma(
  sector: string,
  city: string,
  questions: MarketIntelligenceEntry[],
): Promise<void> {
  const sectorKey = normalizeKey(sector);
  const cityKey = normalizeKey(city);

  await prisma.marketIntelligence.upsert({
    where: {
      sector_city: {
        sector: sectorKey,
        city: cityKey,
      },
    },
    create: {
      sector: sectorKey,
      city: cityKey,
      questions: questions as object,
    },
    update: {
      questions: questions as object,
    },
  });
}

async function upsertViaSupabase(
  sector: string,
  city: string,
  questions: MarketIntelligenceEntry[],
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const sectorKey = normalizeKey(sector);
  const cityKey = normalizeKey(city);

  const { data: existing } = await supabase
    .from("MarketIntelligence")
    .select("id")
    .eq("sector", sectorKey)
    .eq("city", cityKey)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("MarketIntelligence")
      .update({ questions, updatedAt: new Date().toISOString() })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("MarketIntelligence").insert({
    id: crypto.randomUUID(),
    sector: sectorKey,
    city: cityKey,
    questions,
  });
}

export async function saveMarketIntelligence(
  sector: string,
  city: string,
  questions: MarketIntelligenceEntry[],
): Promise<void> {
  const cachePayload = questions.map((entry) => ({
    question: entry.question,
    simulatedAnswer: entry.simulatedAnswer,
  }));

  if (hasDatabaseUrl()) {
    try {
      await upsertViaPrisma(sector, city, cachePayload);
      return;
    } catch (error) {
      console.error("API Hatası:", error);
    }
  }

  await upsertViaSupabase(sector, city, cachePayload);
}

export function toGeoMicroIntents(
  entries: MarketIntelligenceEntry[],
  markaAdi: string,
): Array<{ id: string; question: string; simulatedAnswer: string }> {
  return entries.map((entry, index) => ({
    id: `intent-${index + 1}`,
    question: entry.question,
    simulatedAnswer: personalizeCachedAnswer(entry.simulatedAnswer, markaAdi),
  }));
}
