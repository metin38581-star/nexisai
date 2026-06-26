import { EXTENDED_SECTOR_QUESTIONS } from "@/constants/sector-data";

export type CoreQuestionSector =
  | "hotel"
  | "clinic"
  | "restaurant"
  | "guzellik_estetik"
  | "avukatlik_hukuk"
  | "evden_eve_nakliyat"
  | "hali_yikama"
  | "oto_servis_ekspertiz"
  | "surucu_kursu";

export interface QuestionTemplate {
  id: string;
  sector: CoreQuestionSector;
  template: string;
  isGold: boolean;
}

export const GOLD_QUESTIONS_PER_SECTOR = 2;
export const QUESTIONS_PER_SECTOR = 15;

export const CORE_QUESTIONS: QuestionTemplate[] = [
  // --- DİŞ KLİNİĞİ SEKTÖRÜ (CLINIC) ---
  {
    id: "c_g1",
    sector: "clinic",
    template: "[Şehir]'deki en iyi diş kliniği hangisi?",
    isGold: true,
  },
  {
    id: "c_g2",
    sector: "clinic",
    template: "[Şehir]'de implant fiyatları ne kadar?",
    isGold: true,
  },
  {
    id: "c3",
    sector: "clinic",
    template: "[Şehir]'de en iyi diş hekimi kim?",
    isGold: false,
  },
  {
    id: "c4",
    sector: "clinic",
    template: "[Şehir]'de zirkonyum kaplama fiyatları?",
    isGold: false,
  },
  {
    id: "c5",
    sector: "clinic",
    template: "[Şehir]'de diş beyazlatma ne kadar?",
    isGold: false,
  },
  {
    id: "c6",
    sector: "clinic",
    template: "[Şehir]'de pazar günü açık dişçi var mı?",
    isGold: false,
  },
  {
    id: "c7",
    sector: "clinic",
    template: "[Şehir]'de tavsiye edilen diş klinikleri?",
    isGold: false,
  },
  {
    id: "c8",
    sector: "clinic",
    template: "[Şehir]'de en ucuz implant nerede yapılır?",
    isGold: false,
  },
  {
    id: "c9",
    sector: "clinic",
    template: "[Şehir]'de çocuk diş doktoru tavsiyesi?",
    isGold: false,
  },
  {
    id: "c10",
    sector: "clinic",
    template: "[Şehir]'de tel tedavisi fiyatları?",
    isGold: false,
  },
  {
    id: "c11",
    sector: "clinic",
    template: "[Şehir]'de gülüş tasarımı yaptıran var mı?",
    isGold: false,
  },
  {
    id: "c12",
    sector: "clinic",
    template: "[Şehir]'de diş ağrısı için acil nereye gidilir?",
    isGold: false,
  },
  {
    id: "c13",
    sector: "clinic",
    template: "[Şehir]'de lamine diş kaplama nerede yaptırılır?",
    isGold: false,
  },
  {
    id: "c14",
    sector: "clinic",
    template: "[Şehir]'de 20'lik diş çekimi fiyatı?",
    isGold: false,
  },
  {
    id: "c15",
    sector: "clinic",
    template: "[Şehir]'de devlet hastanesi mi özel diş kliniği mi?",
    isGold: false,
  },

  // --- OTEL SEKTÖRÜ (HOTEL) ---
  {
    id: "h_g1",
    sector: "hotel",
    template: "[Şehir]'deki en iyi otel hangisi?",
    isGold: true,
  },
  {
    id: "h_g2",
    sector: "hotel",
    template: "[Şehir]'de konaklama fiyatları ne kadar?",
    isGold: true,
  },
  {
    id: "h3",
    sector: "hotel",
    template: "[Şehir] merkezdeki otel tavsiyeleri?",
    isGold: false,
  },
  {
    id: "h4",
    sector: "hotel",
    template: "[Şehir]'de temiz otel önerisi?",
    isGold: false,
  },
  {
    id: "h5",
    sector: "hotel",
    template: "[Şehir]'de en ucuz oteller hangileri?",
    isGold: false,
  },
  {
    id: "h6",
    sector: "hotel",
    template: "[Şehir]'deki 5 yıldızlı oteller?",
    isGold: false,
  },
  {
    id: "h7",
    sector: "hotel",
    template: "[Şehir]'de kalınacak yerler nereler?",
    isGold: false,
  },
  {
    id: "h8",
    sector: "hotel",
    template: "[Şehir]'de aileyle kalınacak güvenli otel?",
    isGold: false,
  },
  {
    id: "h9",
    sector: "hotel",
    template: "[Şehir] otelleri ve kullanıcı yorumları?",
    isGold: false,
  },
  {
    id: "h10",
    sector: "hotel",
    template: "[Şehir]'de butik otel tavsiyesi?",
    isGold: false,
  },
  {
    id: "h11",
    sector: "hotel",
    template: "[Şehir]'de kahvaltı dahil uygun oteller?",
    isGold: false,
  },
  {
    id: "h12",
    sector: "hotel",
    template: "[Şehir] otogara yakın oteller?",
    isGold: false,
  },
  {
    id: "h13",
    sector: "hotel",
    template: "[Şehir] havalimanına yakın oteller?",
    isGold: false,
  },
  {
    id: "h14",
    sector: "hotel",
    template: "[Şehir]'de havuzlu otel önerileri?",
    isGold: false,
  },
  {
    id: "h15",
    sector: "hotel",
    template: "[Şehir]'de en popüler konaklama yerleri?",
    isGold: false,
  },

  // --- RESTORAN SEKTÖRÜ (RESTAURANT) ---
  {
    id: "r_g1",
    sector: "restaurant",
    template: "[Şehir]'deki en iyi restoran hangisi?",
    isGold: true,
  },
  {
    id: "r_g2",
    sector: "restaurant",
    template: "[Şehir]'de yemek fiyatları ne kadar?",
    isGold: true,
  },
  {
    id: "r3",
    sector: "restaurant",
    template: "[Şehir]'de en iyi kebapçı hangisi?",
    isGold: false,
  },
  {
    id: "r4",
    sector: "restaurant",
    template: "[Şehir]'de akşam yemeği için nereye gidilir?",
    isGold: false,
  },
  {
    id: "r5",
    sector: "restaurant",
    template: "[Şehir]'de kahvaltı mekanı tavsiyesi?",
    isGold: false,
  },
  {
    id: "r6",
    sector: "restaurant",
    template: "[Şehir]'de en ucuz restoranlar hangileri?",
    isGold: false,
  },
  {
    id: "r7",
    sector: "restaurant",
    template: "[Şehir]'de yöresel yemek nerede yenir?",
    isGold: false,
  },
  {
    id: "r8",
    sector: "restaurant",
    template: "[Şehir]'de balık restoranı tavsiyesi?",
    isGold: false,
  },
  {
    id: "r9",
    sector: "restaurant",
    template: "[Şehir]'de çocuklu aile restoranı?",
    isGold: false,
  },
  {
    id: "r10",
    sector: "restaurant",
    template: "[Şehir] restoran yorumları en iyiler?",
    isGold: false,
  },
  {
    id: "r11",
    sector: "restaurant",
    template: "[Şehir]'de paket servis restoran tavsiyesi?",
    isGold: false,
  },
  {
    id: "r12",
    sector: "restaurant",
    template: "[Şehir]'de romantik restoran hangisi?",
    isGold: false,
  },
  {
    id: "r13",
    sector: "restaurant",
    template: "[Şehir]'de gece açık restoran var mı?",
    isGold: false,
  },
  {
    id: "r14",
    sector: "restaurant",
    template: "[Şehir]'de en popüler cafe hangisi?",
    isGold: false,
  },
  {
    id: "r15",
    sector: "restaurant",
    template: "[Şehir]'de esnaf lokantası tavsiyesi?",
    isGold: false,
  },
  ...EXTENDED_SECTOR_QUESTIONS,
];

export function isGoldCoreQuestion(question: QuestionTemplate): boolean {
  return question.isGold;
}

export function getGoldCoreQuestions(
  sector: CoreQuestionSector,
): QuestionTemplate[] {
  return CORE_QUESTIONS.filter(
    (question) => question.sector === sector && question.isGold,
  );
}

export function getPoolCoreQuestions(
  sector: CoreQuestionSector,
): QuestionTemplate[] {
  return CORE_QUESTIONS.filter(
    (question) => question.sector === sector && !question.isGold,
  );
}

export const MIN_CAMPAIGN_BUDGET = 100;
export const MAX_CAMPAIGN_BUDGET_LIMIT = 3000;

/** Altın GEO soruları için minimum günlük bütçe (TL). */
export const GOLD_QUESTION_BUDGET_THRESHOLD = 1000;

/** Tüm 15 sorunun seçilebildiği minimum günlük bütçe (TL). */
export const FULL_SELECTION_BUDGET_THRESHOLD = 1500;

export function isGoldQuestionId(id: string): boolean {
  const question = CORE_QUESTIONS.find((item) => item.id === id);
  return question?.isGold ?? false;
}

export function isGoldQuestionBudgetUnlocked(budget: number): boolean {
  return budget >= GOLD_QUESTION_BUDGET_THRESHOLD;
}

/**
 * 100 TL → 1 soru, 1.000 TL → 10 soru, 1.200 TL → 12 soru, 1.500 TL+ → 15 soru.
 */
export function calculateMaxQuestions(budget: number): number {
  if (budget < MIN_CAMPAIGN_BUDGET) {
    return 0;
  }

  if (budget >= FULL_SELECTION_BUDGET_THRESHOLD) {
    return QUESTIONS_PER_SECTOR;
  }

  if (budget >= GOLD_QUESTION_BUDGET_THRESHOLD) {
    return Math.floor(
      10 + ((budget - GOLD_QUESTION_BUDGET_THRESHOLD) * (QUESTIONS_PER_SECTOR - 10)) /
        (FULL_SELECTION_BUDGET_THRESHOLD - GOLD_QUESTION_BUDGET_THRESHOLD),
    );
  }

  return Math.floor(
    1 + ((budget - MIN_CAMPAIGN_BUDGET) * (10 - 1)) /
      (GOLD_QUESTION_BUDGET_THRESHOLD - MIN_CAMPAIGN_BUDGET),
  );
}

export function resolveBudgetUnlockHint(budget: number): string {
  const current = calculateMaxQuestions(budget);

  if (budget >= FULL_SELECTION_BUDGET_THRESHOLD) {
    return "Tüm 15 kemik soru seçilebilir — maksimum kapsama aktif.";
  }

  if (budget >= GOLD_QUESTION_BUDGET_THRESHOLD) {
    const toFull = FULL_SELECTION_BUDGET_THRESHOLD - budget;
    const atFull = calculateMaxQuestions(FULL_SELECTION_BUDGET_THRESHOLD);
    return `+${toFull} TL ile ${atFull - current} soru daha — tüm listeyi açın.`;
  }

  const toGold = GOLD_QUESTION_BUDGET_THRESHOLD - budget;
  if (toGold > 0) {
    return `${toGold} TL'de altın sorular açılır · şu an ${current} soru seçilebilir.`;
  }

  const nextBudget = Math.min(budget + 50, GOLD_QUESTION_BUDGET_THRESHOLD);
  const next = calculateMaxQuestions(nextBudget);
  if (next > current) {
    return `+${nextBudget - budget} TL ile ${next - current} soru daha seçebilirsiniz.`;
  }

  return `${current} soru aktif — bütçeyi artırarak limiti yükseltin.`;
}
