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
  tier: "standard" | "advanced" | "domination" | "quantum";
  tierLabel: string;
  analysisDescription: string;
}

/** Günlük bütçeye göre LLM soru havuzu / seçim limiti. */
export function resolveMaxQuestionsFromDailyBudget(dailyBudget: number): number {
  if (dailyBudget >= 2000) {
    return MAX_GEO_INTENTS;
  }
  if (dailyBudget >= 1000) {
    return 16;
  }
  if (dailyBudget >= 400) {
    return 12;
  }
  if (dailyBudget >= 200) {
    return 8;
  }
  return 5;
}

/** Slider yanında gösterilecek canlı pazar analizi açıklaması. */
export function resolveMarketAnalysisDepthDescription(
  dailyBudget: number,
): string {
  const maxQuestions = resolveMaxQuestionsFromDailyBudget(dailyBudget);

  if (dailyBudget >= 2000) {
    return `Kuantum Alpha: ${maxQuestions} kritik hedef otonom ajanlarla 7/24 domine edilir — mutlak görünürlük modu.`;
  }
  if (dailyBudget >= 1000) {
    return `Kritik Domination: ${maxQuestions} hedef saatlik radar ile yapay zeka motorlarında eşzamanlı baskınlık kurar.`;
  }
  if (dailyBudget >= 400) {
    return `Gelişmiş Operasyon: ${maxQuestions} hedef çift motorlu (ChatGPT + Gemini) semantik analizle taranır.`;
  }
  return `Standart Giriş: En popüler ${maxQuestions} soru analiz edilir — temel yapay zeka görünürlüğü başlatılır.`;
}

/** Otonom kampanya başlat butonu metni — bütçe kademesine göre. */
export function resolveAutonomousCampaignButtonLabel(dailyBudget: number): string {
  const count = resolveMaxQuestionsFromDailyBudget(dailyBudget);

  if (dailyBudget >= 2000) {
    return `🚀 Kuantum Alpha — ${count} Hedefle Otonom Domination Başlat`;
  }
  if (dailyBudget >= 1000) {
    return `🔥 ${count} Hedefle Kritik Domination Başlat`;
  }
  if (dailyBudget >= 400) {
    return `${count} Hedefle Gelişmiş Operasyonu Başlat`;
  }
  return `${count} Kritik Hedefle Otonom Kampanyayı Başlat`;
}

export function resolveIntentSoftCap(input: IntentSoftCapInput): IntentSoftCapResult {
  const dailyBudget = Math.max(0, input.dailyBudget);
  const bonusUnlocks = input.bonusUnlocks ?? 0;
  const maxQuestions = resolveMaxQuestionsFromDailyBudget(dailyBudget);
  const softCap = Math.min(MAX_GEO_INTENTS, maxQuestions + bonusUnlocks);

  let tier: IntentSoftCapResult["tier"];
  let tierLabel: string;

  if (dailyBudget >= 2000) {
    tier = "quantum";
    tierLabel = "Kuantum Alpha Modu";
  } else if (dailyBudget >= 1000) {
    tier = "domination";
    tierLabel = "Kritik Domination Modu";
  } else if (dailyBudget >= 400) {
    tier = "advanced";
    tierLabel = "Gelişmiş Operasyon Modu";
  } else {
    tier = "standard";
    tierLabel = "Standart Giriş Modu";
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
