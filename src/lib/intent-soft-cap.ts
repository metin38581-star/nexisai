import {
  calculateMaxQuestions,
  MAX_CAMPAIGN_BUDGET_LIMIT,
  MIN_CAMPAIGN_BUDGET,
} from "@/constants/campaign";

/** Kampanya bütçesine +50 ekleyerek kilidi açılan ek anahtar kelime slotu maliyeti ($). */
export const INTENT_UNLOCK_BUDGET_COST = 50;

export const MAX_GEO_INTENTS = 100;

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
  poolSize = 30,
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
  if (dailyBudget >= 2500) {
    return `Tam Spektrum: ${maxQuestions} kemik soru ile yapay zeka arama motorlarında maksimum kapsama — tüm havuz aktif.`;
  }
  if (dailyBudget >= 1200) {
    return `Genişletilmiş Operasyon: ${maxQuestions} hedef soru ile çok kanallı GEO baskınlığı kuruluyor.`;
  }
  if (dailyBudget >= 600) {
    return `Gelişmiş Operasyon: ${maxQuestions} kritik soru ile semantik görünürlük genişletiliyor.`;
  }
  if (dailyBudget >= 300) {
    return `Büyüme Modu: ${maxQuestions} soru seçilebilir — bütçe artışıyla limit anında yükselir.`;
  }
  return `Başlangıç Paketi: ${maxQuestions} soru seçilebilir — bütçe barını kaydırarak limiti artırın.`;
}

/** Kampanya başlat butonu metni — seçilen soru limitine göre. */
export function resolveCampaignLaunchButtonLabel(
  dailyBudget: number,
  selectedCount: number,
  maxQuestions: number,
): string {
  if (dailyBudget >= 2500) {
    return `🚀 ${selectedCount} Soru ile Tam Spektrum Kampanyayı Başlat`;
  }
  if (dailyBudget >= 1200) {
    return `🔥 ${selectedCount}/${maxQuestions} Soru ile Genişletilmiş GEO Başlat`;
  }
  if (dailyBudget >= 600) {
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
  const poolSize = input.poolSize ?? 30;
  const maxQuestions = resolveMaxQuestionsFromDailyBudget(dailyBudget, poolSize);
  const softCap = Math.min(MAX_GEO_INTENTS, maxQuestions + bonusUnlocks);

  let tier: IntentSoftCapResult["tier"];
  let tierLabel: string;

  if (dailyBudget >= 2500) {
    tier = "quantum";
    tierLabel = "Tam Spektrum Modu";
  } else if (dailyBudget >= 1200) {
    tier = "domination";
    tierLabel = "Genişletilmiş Operasyon";
  } else if (dailyBudget >= 600) {
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
  poolSize = 30,
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
  poolSize = 30,
): number {
  return Math.min(
    MAX_GEO_INTENTS,
    resolveMaxQuestionsFromDailyBudget(dailyBudget, poolSize) + bonusUnlocks,
  );
}

export { calculateMaxQuestions, MAX_CAMPAIGN_BUDGET_LIMIT, MIN_CAMPAIGN_BUDGET };
