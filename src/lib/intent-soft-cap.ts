/** Kampanya bütçesine +50 ekleyerek kilidi açılan ek anahtar kelime slotu maliyeti ($). */
export const INTENT_UNLOCK_BUDGET_COST = 50;

export const MAX_GEO_INTENTS = 20;

export interface IntentSoftCapInput {
  dailyBudget: number;
  campaignDays?: number;
  walletBalance?: number;
  bonusUnlocks?: number;
}

export interface IntentSoftCapResult {
  softCap: number;
  maxQuestions: number;
  effectiveBudget: number;
  tier: "low" | "medium" | "high" | "domination";
  tierLabel: string;
  analysisDescription: string;
}

/** Günlük bütçeye göre LLM soru havuzu / seçim limiti. */
export function resolveMaxQuestionsFromDailyBudget(dailyBudget: number): number {
  if (dailyBudget <= 50) {
    return 2;
  }
  if (dailyBudget <= 150) {
    return 5;
  }
  if (dailyBudget <= 300) {
    return 10;
  }
  return MAX_GEO_INTENTS;
}

/** Slider yanında gösterilecek canlı pazar analizi açıklaması. */
export function resolveMarketAnalysisDepthDescription(
  dailyBudget: number,
): string {
  const maxQuestions = resolveMaxQuestionsFromDailyBudget(dailyBudget);

  if (dailyBudget <= 50) {
    return `Düşük bütçe: En popüler ${maxQuestions} soru analiz edilecek`;
  }
  if (dailyBudget <= 150) {
    return `Orta bütçe: En popüler ${maxQuestions} soru analiz edilecek`;
  }
  if (dailyBudget <= 300) {
    return `Yüksek bütçe: En popüler ${maxQuestions} soru derinlemesine analiz edilecek`;
  }
  return `Agresif bütçe: En popüler ${maxQuestions} soru analiz edilip domine edilecek`;
}

export function resolveIntentSoftCap(input: IntentSoftCapInput): IntentSoftCapResult {
  const dailyBudget = Math.max(0, input.dailyBudget);
  const bonusUnlocks = input.bonusUnlocks ?? 0;
  const maxQuestions = resolveMaxQuestionsFromDailyBudget(dailyBudget);
  const softCap = Math.min(MAX_GEO_INTENTS, maxQuestions + bonusUnlocks);

  let tier: IntentSoftCapResult["tier"];
  let tierLabel: string;

  if (dailyBudget > 300) {
    tier = "domination";
    tierLabel = "Dominasyon Modu";
  } else if (dailyBudget > 150) {
    tier = "high";
    tierLabel = "Agresif Mod";
  } else if (dailyBudget > 50) {
    tier = "medium";
    tierLabel = "Büyüme Modu";
  } else {
    tier = "low";
    tierLabel = "Keşif Modu";
  }

  return {
    softCap,
    maxQuestions,
    effectiveBudget: dailyBudget,
    tier,
    tierLabel,
    analysisDescription: resolveMarketAnalysisDepthDescription(dailyBudget),
  };
}

export function resolveSoftCapAfterBudgetIncrease(
  currentDailyBudget: number,
  increase = INTENT_UNLOCK_BUDGET_COST,
): number {
  return resolveMaxQuestionsFromDailyBudget(currentDailyBudget + increase);
}

export function canSelectMoreIntents(
  selectedCount: number,
  softCap: number,
): boolean {
  return selectedCount < softCap;
}

export function resolveSelectedQuestionLimit(
  dailyBudget: number,
  bonusUnlocks = 0,
): number {
  return Math.min(
    MAX_GEO_INTENTS,
    resolveMaxQuestionsFromDailyBudget(dailyBudget) + bonusUnlocks,
  );
}
