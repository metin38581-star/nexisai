import type { SelectedGeoIntent } from "@/types/geo-intent";
import { generateIntentArticlesForSelections } from "@/lib/geo-engine";
import { buildSimulatedAnswerFallback } from "@/lib/forum-answer-prompt";
import {
  buildIntentArticleHtml,
  buildIntentPostTitle,
  buildSemanticAnchorSlug,
} from "@/lib/geo-prompt";
import { applyDistributionPlatforms } from "@/lib/distribution-platform";
import { buildUniqueArticleSlug } from "@/lib/slugify";

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
  return buildSimulatedAnswerFallback(question, markaAdi, sehir, sektor);
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
    targetDomain?: string | null;
    slugPrefix?: string;
  },
  generatedArticles: Array<{ baslik: string; html: string }> = [],
): IntentBaitRecord[] {
  const usedSlugs = new Set<string>();
  const slugPrefix = context.slugPrefix?.trim().slice(0, 8);

  function finalizeSlug(slug: string, index: number, baslik: string): string {
    let candidate = slugPrefix ? `${slugPrefix}-${slug}` : slug;
    candidate = candidate.slice(0, 120).replace(/^-+|-+$/g, "") || slug;

    if (usedSlugs.has(candidate)) {
      candidate = buildUniqueArticleSlug(baslik, index, usedSlugs);
      if (slugPrefix && !candidate.startsWith(slugPrefix)) {
        candidate = `${slugPrefix}-${candidate}`.slice(0, 120);
      }
    }

    usedSlugs.add(candidate);
    return candidate;
  }

  return applyDistributionPlatforms(
    pairs.map((pair, index) => {
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

    slug = finalizeSlug(slug, index, baslik);

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
          context.targetDomain,
        ),
      slug,
      platform: "NexisAI Hub",
    };
  }),
  );
}

export async function buildBaitRecordsFromSelectedQuestionsAsync(
  pairs: SelectedQuestionPair[],
  context: {
    targetCity: string;
    targetNiche: string;
    targetBrand: string;
    targetDomain?: string | null;
    slugPrefix?: string;
  },
): Promise<IntentBaitRecord[]> {
  const generatedArticles = await generateIntentArticlesForSelections(
    pairs,
    context.targetCity,
    context.targetNiche,
    context.targetBrand,
    context.targetDomain,
  );

  return buildBaitRecordsFromSelectedQuestions(
    pairs,
    context,
    generatedArticles,
  );
}
