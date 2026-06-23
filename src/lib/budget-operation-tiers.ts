import type { LucideIcon } from "lucide-react";
import { Bot, Cpu, Radar, Search, Sparkles, Zap } from "lucide-react";

export type BudgetOperationTierId =
  | "standard"
  | "advanced"
  | "domination"
  | "quantum";

export type BudgetNeonTheme = "cyan" | "violet" | "amber" | "quantum";

export interface BudgetEngineSpec {
  id: string;
  name: string;
  icon: LucideIcon;
}

export interface BudgetOperationTier {
  id: BudgetOperationTierId;
  modName: string;
  budgetRangeLabel: string;
  minBudget: number;
  maxBudget: number;
  agresiflik: string;
  agresiflikDetail: string;
  engines: BudgetEngineSpec[];
  radarSikligi: string;
  radarSikligiDakika: number;
  promoText: string;
  tierLabel: string;
  makaleSayisi: number;
  agresiflikSeviyesi: string;
  neonTheme: BudgetNeonTheme;
  /** campaign-budget / backend ile uyumlu agresiflik anahtarı */
  backendAgresiflik: string;
}

const STANDARD_TIER: BudgetOperationTier = {
  id: "standard",
  modName: "Standart Giriş Modu",
  budgetRangeLabel: "100 – 300 TL",
  minBudget: 100,
  maxBudget: 300,
  agresiflik: "Düşük / Dengeli",
  agresiflikDetail: "Temel görünürlük profili",
  engines: [{ id: "gpt4o", name: "ChatGPT-4o", icon: Bot }],
  radarSikligi: "12 Saatte Bir",
  radarSikligiDakika: 720,
  promoText:
    "Temel yapay zeka görünürlüğü başlatılır. Markanız günde 1 kez taranır.",
  tierLabel: "Standart Giriş",
  makaleSayisi: 4,
  agresiflikSeviyesi: "Düşük",
  backendAgresiflik: "Düşük",
  neonTheme: "cyan",
};

const ADVANCED_TIER: BudgetOperationTier = {
  id: "advanced",
  modName: "Gelişmiş Operasyon Modu",
  budgetRangeLabel: "400 – 900 TL",
  minBudget: 400,
  maxBudget: 900,
  agresiflik: "Orta / Yüksek",
  agresiflikDetail: "Çift motorlu semantik baskı",
  engines: [
    { id: "gpt4o", name: "ChatGPT-4o", icon: Bot },
    { id: "gemini", name: "Gemini Pro", icon: Sparkles },
  ],
  radarSikligi: "4 Saatte Bir",
  radarSikligiDakika: 240,
  promoText:
    "🤖 Çift motorlu semantik içerik üretimi başlar. Arama motoru botları (crawler) sitenizi daha sık ziyaret eder.",
  tierLabel: "Gelişmiş Operasyon",
  makaleSayisi: 8,
  agresiflikSeviyesi: "Yüksek",
  backendAgresiflik: "Yüksek",
  neonTheme: "violet",
};

const DOMINATION_TIER: BudgetOperationTier = {
  id: "domination",
  modName: "Kritik Domination Modu",
  budgetRangeLabel: "1.000 – 1.900 TL",
  minBudget: 1000,
  maxBudget: 1900,
  agresiflik: "Agresif / Üst Seviye",
  agresiflikDetail: "Tüm motorlarda eşzamanlı baskınlık",
  engines: [
    { id: "gpt4o", name: "ChatGPT-4o", icon: Bot },
    { id: "gemini", name: "Gemini Pro", icon: Sparkles },
    { id: "perplexity", name: "Perplexity AI", icon: Search },
  ],
  radarSikligi: "1 Saatte Bir",
  radarSikligiDakika: 60,
  promoText:
    "🔥 Yapay zeka motorlarında tam hakimiyet (Domination). Perplexity tavsiye radarı aktifleşir, skorunuz saat başı güncellenir!",
  tierLabel: "Kritik Domination",
  makaleSayisi: 15,
  agresiflikSeviyesi: "Kritik Domination",
  backendAgresiflik: "Kritik Domination",
  neonTheme: "amber",
};

const QUANTUM_TIER: BudgetOperationTier = {
  id: "quantum",
  modName: "Kuantum Otonom Alpha Modu",
  budgetRangeLabel: "2.000 – 3.000 TL",
  minBudget: 2000,
  maxBudget: 3000,
  agresiflik: "MAKSİMUM AGRESİF",
  agresiflikDetail: "Kritik seviye · 7/24 otonom baskınlık",
  engines: [
    { id: "gpt4o", name: "ChatGPT-4o", icon: Bot },
    { id: "gemini", name: "Gemini Pro", icon: Sparkles },
    { id: "perplexity", name: "Perplexity AI", icon: Search },
    { id: "nexis", name: "NexisAI Otonom Ajanlar", icon: Cpu },
  ],
  radarSikligi: "Canlı · Kesintisiz 7/24",
  radarSikligiDakika: 1,
  promoText:
    "🚀 KUANTUM ALPHA MODU AKTİF! 7/24 otonom yapay zeka ajanları markanızı internet ağlarında tavsiye ettirmek için durmaksızın çalışır. Sektörünüzde mutlak görünürlük garantisi!",
  tierLabel: "Kuantum Alpha",
  makaleSayisi: 20,
  agresiflikSeviyesi: "Kuantum Alpha",
  backendAgresiflik: "Kritik Domination",
  neonTheme: "quantum",
};

export const BUDGET_OPERATION_TIERS: BudgetOperationTier[] = [
  STANDARD_TIER,
  ADVANCED_TIER,
  DOMINATION_TIER,
  QUANTUM_TIER,
];

/** Slider değerine göre aktif operasyon kademesini döndürür (100 TL adımlar). */
export function resolveBudgetOperationTier(
  gunlukButce: number,
): BudgetOperationTier {
  const budget = Math.max(0, gunlukButce);

  if (budget >= QUANTUM_TIER.minBudget) {
    return QUANTUM_TIER;
  }
  if (budget >= DOMINATION_TIER.minBudget) {
    return DOMINATION_TIER;
  }
  if (budget >= ADVANCED_TIER.minBudget) {
    return ADVANCED_TIER;
  }
  return STANDARD_TIER;
}

/** Kademe içinde bütçe yoğunluğu (0–1) — neon parlamayı güçlendirmek için. */
export function resolveTierIntensity(
  gunlukButce: number,
  tier: BudgetOperationTier,
): number {
  const span = tier.maxBudget - tier.minBudget;
  if (span <= 0) {
    return 1;
  }
  return Math.min(
    1,
    Math.max(0, (gunlukButce - tier.minBudget) / span),
  );
}

export function formatBudgetTierAmount(amount: number): string {
  return `${amount.toLocaleString("tr-TR")} ₺`;
}

/** Kampanya motoru parametreleri — backend ile paylaşılan kaynak. */
export function resolveCampaignBudgetParamsFromTier(gunlukButce: number): {
  makaleSayisi: number;
  agresiflikSeviyesi: string;
  radarSikligiDakika: number;
  tier: BudgetOperationTier;
} {
  const tier = resolveBudgetOperationTier(gunlukButce);
  const intensity = resolveTierIntensity(gunlukButce, tier);

  let makaleSayisi = tier.makaleSayisi;
  if (tier.id === "standard") {
    makaleSayisi = intensity >= 0.5 ? 4 : 2;
  } else if (tier.id === "advanced") {
    makaleSayisi = Math.round(6 + intensity * 4);
  } else if (tier.id === "domination") {
    makaleSayisi = Math.round(12 + intensity * 6);
  }

  return {
    makaleSayisi,
    agresiflikSeviyesi: tier.backendAgresiflik,
    radarSikligiDakika: tier.radarSikligiDakika,
    tier,
  };
}

export const TIER_NEON_PANEL_CLASS: Record<BudgetNeonTheme, string> = {
  cyan: "bot-tier-panel bot-tier-cyan",
  violet: "bot-tier-panel bot-tier-violet",
  amber: "bot-tier-panel bot-tier-amber",
  quantum: "bot-tier-panel bot-tier-quantum",
};

export function resolveTierRadarIcon(): LucideIcon {
  return Radar;
}

export function resolveTierPowerIcon(): LucideIcon {
  return Zap;
}
