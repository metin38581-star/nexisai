import type { MarketIntelligenceEntry } from "@/types/market-intelligence";
import {
  brandToCachePlaceholder,
  saveMarketIntelligence,
  personalizeCachedAnswer,
} from "@/lib/market-intelligence-store";
import { generateMicroIntents } from "@/lib/geo-engine";

export async function generateMarketIntelligence(
  sehir: string,
  sektor: string,
  markaAdi: string,
  maxQuestions: number,
): Promise<MarketIntelligenceEntry[]> {
  const intents = await generateMicroIntents(
    sehir,
    sektor,
    markaAdi,
    maxQuestions,
  );
  const sliced = intents.slice(0, maxQuestions);

  const cacheEntries: MarketIntelligenceEntry[] = sliced.map((intent) => ({
    question: intent.question,
    simulatedAnswer: brandToCachePlaceholder(intent.simulatedAnswer, markaAdi),
  }));

  if (cacheEntries.length > 0) {
    await saveMarketIntelligence(sektor, sehir, cacheEntries);
  }

  return sliced.map((intent) => ({
    question: intent.question,
    simulatedAnswer: intent.simulatedAnswer,
  }));
}

export function entriesForClient(
  entries: MarketIntelligenceEntry[],
  markaAdi: string,
): MarketIntelligenceEntry[] {
  return entries.map((entry) => ({
    question: entry.question,
    simulatedAnswer: personalizeCachedAnswer(entry.simulatedAnswer, markaAdi),
  }));
}
