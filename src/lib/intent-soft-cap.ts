/** Kampanya bütçesine +50 ekleyerek kilidi açılan ek anahtar kelime slotu maliyeti ($). */
export const INTENT_UNLOCK_BUDGET_COST = 50;

export const MAX_GEO_INTENTS = 10;

export interface IntentSoftCapInput {
  dailyBudget: number;
  campaignDays: number;
  walletBalance: number;
  bonusUnlocks?: number;
}

export interface IntentSoftCapResult {
  softCap: number;
  effectiveBudget: number;
  tier: "low" | "medium" | "high";
  tierLabel: string;
}

export function resolveIntentSoftCap(input: IntentSoftCapInput): IntentSoftCapResult {
  const campaignBudget = input.dailyBudget * input.campaignDays;
  const effectiveBudget = Math.min(campaignBudget, input.walletBalance);
  const bonusUnlocks = input.bonusUnlocks ?? 0;

  let baseCap: number;
  let tier: IntentSoftCapResult["tier"];
  let tierLabel: string;

  if (effectiveBudget >= 200) {
    baseCap = MAX_GEO_INTENTS;
    tier = "high";
    tierLabel = "Dominasyon Modu";
  } else if (effectiveBudget >= 80) {
    baseCap = 5;
    tier = "medium";
    tierLabel = "Agresif Mod";
  } else {
    baseCap = 2;
    tier = "low";
    tierLabel = "Keşif Modu";
  }

  const softCap = Math.min(MAX_GEO_INTENTS, baseCap + bonusUnlocks);

  return {
    softCap,
    effectiveBudget,
    tier,
    tierLabel,
  };
}

export function canSelectMoreIntents(
  selectedCount: number,
  softCap: number,
): boolean {
  return selectedCount < softCap;
}
