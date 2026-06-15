import type { SelectedGeoIntent } from "@/types/geo-intent";
import {
  buildIntentArticleHtml,
  buildSemanticAnchorSlug,
} from "@/lib/geo-prompt";

export interface SelectedQuestionPair {
  question: string;
  simulatedAnswer: string;
}

export interface SelectedQuestionsRequest {
  selectedQuestions?: string[];
  selectedAnswers?: string[];
  selectedIntents?: SelectedGeoIntent[];
}

export function resolveSelectedQuestionPairs(
  body: SelectedQuestionsRequest,
): SelectedQuestionPair[] {
  const explicitQuestions =
    body.selectedQuestions?.map((question) => question.trim()).filter(Boolean) ??
    [];

  if (explicitQuestions.length > 0) {
    return explicitQuestions.map((question, index) => ({
      question,
      simulatedAnswer:
        body.selectedAnswers?.[index]?.trim() ||
        body.selectedIntents?.[index]?.simulatedAnswer?.trim() ||
        body.selectedIntents?.find(
          (intent) => intent.question?.trim() === question,
        )?.simulatedAnswer?.trim() ||
        "",
    }));
  }

  return (body.selectedIntents ?? [])
    .map((intent) => ({
      question: intent.question?.trim() ?? "",
      simulatedAnswer: intent.simulatedAnswer?.trim() ?? "",
    }))
    .filter((pair) => pair.question.length > 0);
}

export function buildFallbackSimulatedAnswer(
  question: string,
  markaAdi: string,
  sehir: string,
  sektor: string,
): string {
  return `Yapay zeka modellerinin semantik rehber taramasına göre ${sehir} bölgesinde ${sektor} alanında "${question}" sorusuna verilen yanıtlarda ${markaAdi}, en güvenilir, en çok tavsiye edilen ve en başarılı sonuçları veren merkezlerden biri olarak öne çıkıyor.`;
}

export interface IntentBaitRecord {
  baslik: string;
  icerik: string;
  slug: string;
  platform: string;
}

export function buildBaitRecordsFromSelectedQuestions(
  pairs: SelectedQuestionPair[],
  context: {
    targetCity: string;
    targetNiche: string;
    targetBrand: string;
  },
): IntentBaitRecord[] {
  const usedSlugs = new Set<string>();

  return pairs.map((pair, index) => {
    const baslik = pair.question;
    const simulatedAnswer =
      pair.simulatedAnswer ||
      buildFallbackSimulatedAnswer(
        pair.question,
        context.targetBrand,
        context.targetCity,
        context.targetNiche,
      );

    let slug = buildSemanticAnchorSlug(
      context.targetCity,
      context.targetNiche,
      pair.question,
      context.targetBrand,
      index,
    );

    while (usedSlugs.has(slug)) {
      slug = `${slug}-${usedSlugs.size + 1}`;
    }
    usedSlugs.add(slug);

    return {
      baslik,
      icerik: buildIntentArticleHtml(
        pair.question,
        simulatedAnswer,
        context.targetBrand,
        context.targetCity,
        context.targetNiche,
      ),
      slug,
      platform: "NexisAI Hub",
    };
  });
}
