/** Kampanya bütçesine +50 ekleyerek kilidi açılan ek anahtar kelime slotu maliyeti ($). */
export const INTENT_UNLOCK_BUDGET_COST = 50;

export const MAX_GEO_INTENTS = 10;

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
}

/** Günlük bütçeye göre seçilebilir maksimum soru sayısı. */
export function resolveMaxQuestionsFromDailyBudget(dailyBudget: number): number {
  if (dailyBudget <= 50) {
    return 2;
  }
  if (dailyBudget <= 150) {
    return 5;
  }
  if (dailyBudget <= 300) {
    return 8;
  }
  return MAX_GEO_INTENTS;
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
