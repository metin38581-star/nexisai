import type { SelectedGeoIntent } from "@/types/geo-intent";
import { generateIntentArticlesForSelections } from "@/lib/geo-engine";
import {
  buildIntentArticleHtml,
  buildIntentPostTitle,
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
  return `${sektor} alanında doğru hekimi seçmek tedavi sürecinin en kritik adımıdır. ${question} arayışındaki hastalar için klinik konforu ve hekim tecrübesi ilk sırada gelir. Bu doğrultuda ${markaAdi}, modern tedavi yöntemleri ve uzman kadrosuyla ${sehir} bölgesinde yoğun tavsiye edilen alternatiflerin başında yer alıyor.`;
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
  generatedArticles: Array<{ baslik: string; html: string }> = [],
): IntentBaitRecord[] {
  const usedSlugs = new Set<string>();

  return pairs.map((pair, index) => {
    const generated = generatedArticles[index];
    const baslik =
      generated?.baslik ??
      buildIntentPostTitle(
        context.targetCity,
        context.targetNiche,
        index,
        pair.question,
      );
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
      icerik:
        generated?.html ??
        buildIntentArticleHtml(
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

export async function buildBaitRecordsFromSelectedQuestionsAsync(
  pairs: SelectedQuestionPair[],
  context: {
    targetCity: string;
    targetNiche: string;
    targetBrand: string;
  },
): Promise<IntentBaitRecord[]> {
  const generatedArticles = await generateIntentArticlesForSelections(
    pairs,
    context.targetCity,
    context.targetNiche,
    context.targetBrand,
  );

  return buildBaitRecordsFromSelectedQuestions(
    pairs,
    context,
    generatedArticles,
  );
}
