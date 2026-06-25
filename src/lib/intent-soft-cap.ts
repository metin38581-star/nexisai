import {
  calculateMaxQuestions,
  FULL_SELECTION_BUDGET_THRESHOLD,
  GOLD_QUESTION_BUDGET_THRESHOLD,
  MAX_CAMPAIGN_BUDGET_LIMIT,
  MIN_CAMPAIGN_BUDGET,
  QUESTIONS_PER_SECTOR,
} from "@/constants/campaign";

/** Kampanya bütçesine +50 ekleyerek kilidi açılan ek anahtar kelime slotu maliyeti ($). */
export const INTENT_UNLOCK_BUDGET_COST = 50;

export const MAX_GEO_INTENTS = QUESTIONS_PER_SECTOR;

export interface IntentSoftCapInput {
  dailyBudget: number;
  campaignDays?: number;
  walletBalance?: number;
  bonusUnlocks?: number;
  poolSize?: number;
}

export interface IntentSoftCapResult {
  softCap: number;
  maxQuestions: number;
  effectiveBudget: number;
  tier: "standard" | "advanced" | "domination" | "quantum";
  tierLabel: string;
  analysisDescription: string;
}

/** Günlük bütçeye göre kemik soru seçim limiti. */
export function resolveMaxQuestionsFromDailyBudget(
  dailyBudget: number,
  poolSize = QUESTIONS_PER_SECTOR,
): number {
  if (dailyBudget < MIN_CAMPAIGN_BUDGET) {
    return 0;
  }

  return Math.min(calculateMaxQuestions(dailyBudget), poolSize);
}

/** Slider yanında gösterilecek canlı pazar analizi açıklaması. */
export function resolveMarketAnalysisDepthDescription(
  dailyBudget: number,
  maxQuestions: number,
): string {
  if (dailyBudget >= FULL_SELECTION_BUDGET_THRESHOLD) {
    return `Tam Liste: ${maxQuestions}/15 kemik soru — yapay zeka arama motorlarında maksimum kapsama.`;
  }
  if (dailyBudget >= GOLD_QUESTION_BUDGET_THRESHOLD) {
    return `Altın Soru Modu: ${maxQuestions} hedef seçilebilir — 1.500 TL'de tüm liste açılır.`;
  }
  if (dailyBudget >= 500) {
    return `Büyüme Modu: ${maxQuestions} soru seçilebilir — bütçe artışıyla limit anında yükselir.`;
  }
  return `Başlangıç: ${maxQuestions} soru seçilebilir — bütçe barını kaydırarak limiti artırın.`;
}

/** Kampanya başlat butonu metni — seçilen soru limitine göre. */
export function resolveCampaignLaunchButtonLabel(
  dailyBudget: number,
  selectedCount: number,
  maxQuestions: number,
): string {
  if (dailyBudget >= FULL_SELECTION_BUDGET_THRESHOLD) {
    return `🚀 ${selectedCount}/15 Soru ile Tam Liste Kampanyayı Başlat`;
  }
  if (dailyBudget >= GOLD_QUESTION_BUDGET_THRESHOLD) {
    return `🔥 ${selectedCount}/${maxQuestions} Soru ile Altın GEO Kampanyayı Başlat`;
  }
  if (dailyBudget >= 500) {
    return `${selectedCount}/${maxQuestions} Soru ile Gelişmiş Kampanyayı Başlat`;
  }
  return `${selectedCount}/${maxQuestions} Kemik Soru ile Kampanyayı Başlat`;
}

/** @deprecated Otonom akış kaldırıldı; geriye dönük importlar için. */
export function resolveAutonomousCampaignButtonLabel(dailyBudget: number): string {
  const maxQuestions = resolveMaxQuestionsFromDailyBudget(dailyBudget);
  return resolveCampaignLaunchButtonLabel(dailyBudget, maxQuestions, maxQuestions);
}

export function resolveIntentSoftCap(input: IntentSoftCapInput): IntentSoftCapResult {
  const dailyBudget = Math.max(0, input.dailyBudget);
  const bonusUnlocks = input.bonusUnlocks ?? 0;
  const poolSize = input.poolSize ?? QUESTIONS_PER_SECTOR;
  const maxQuestions = resolveMaxQuestionsFromDailyBudget(dailyBudget, poolSize);
  const softCap = Math.min(MAX_GEO_INTENTS, maxQuestions + bonusUnlocks);

  let tier: IntentSoftCapResult["tier"];
  let tierLabel: string;

  if (dailyBudget >= FULL_SELECTION_BUDGET_THRESHOLD) {
    tier = "quantum";
    tierLabel = "Tam Liste Modu";
  } else if (dailyBudget >= GOLD_QUESTION_BUDGET_THRESHOLD) {
    tier = "domination";
    tierLabel = "Altın Soru Modu";
  } else if (dailyBudget >= 500) {
    tier = "advanced";
    tierLabel = "Gelişmiş Operasyon Modu";
  } else {
    tier = "standard";
    tierLabel = "Başlangıç Modu";
  }

  return {
    softCap,
    maxQuestions,
    effectiveBudget: dailyBudget,
    tier,
    tierLabel,
    analysisDescription: resolveMarketAnalysisDepthDescription(
      dailyBudget,
      maxQuestions,
    ),
  };
}

export function resolveSoftCapAfterBudgetIncrease(
  currentDailyBudget: number,
  poolSize = QUESTIONS_PER_SECTOR,
  increase = INTENT_UNLOCK_BUDGET_COST,
): number {
  return resolveMaxQuestionsFromDailyBudget(
    currentDailyBudget + increase,
    poolSize,
  );
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
  poolSize = QUESTIONS_PER_SECTOR,
): number {
  return Math.min(
    MAX_GEO_INTENTS,
    resolveMaxQuestionsFromDailyBudget(dailyBudget, poolSize) + bonusUnlocks,
  );
}

export { calculateMaxQuestions, MAX_CAMPAIGN_BUDGET_LIMIT, MIN_CAMPAIGN_BUDGET };
