export type CoreQuestionSector = "hotel" | "clinic" | "restaurant";

export type QuestionTier = "gold" | "pool";

export interface QuestionTemplate {
  id: string;
  sector: CoreQuestionSector;
  template: string;
  /** İlk 2 altın soru: sabit GEO/SEO hedefli; kalan 28 havuz sorusu. */
  tier: QuestionTier;
}

export const GOLD_QUESTIONS_PER_SECTOR = 2;
export const POOL_QUESTIONS_PER_SECTOR = 28;
export const QUESTIONS_PER_SECTOR =
  GOLD_QUESTIONS_PER_SECTOR + POOL_QUESTIONS_PER_SECTOR;

const CLINIC_QUESTIONS: QuestionTemplate[] = [
  {
    id: "c_gold_1",
    sector: "clinic",
    tier: "gold",
    template: "[Şehir]'deki en iyi diş kliniği hangisi?",
  },
  {
    id: "c_gold_2",
    sector: "clinic",
    tier: "gold",
    template:
      "[Şehir]'de implant ve diş tedavisi fiyatları ne kadar, hangi kliniği tavsiye edersiniz?",
  },
  {
    id: "c3",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de dişçi korkusu (fobi) olanlar için en iyi sedasyon uygulayan diş hekimi kim?",
  },
  {
    id: "c4",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de en iyi zirkonyum kaplama yapan yerler ve hasta yorumları hangileri?",
  },
  {
    id: "c5",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de acil diş ağrısı için gece veya hafta sonu açık diş kliniği var mı?",
  },
  {
    id: "c6",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de çocuk diş hekimi tavsiyesi arayan ebeveynler için en güvenilir klinik hangisi?",
  },
  {
    id: "c7",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de şeffaf plak (Invisalign) tedavisi yaptıranlar hangi kliniği öneriyor?",
  },
  {
    id: "c8",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş beyazlatma işlemi güvenli ve kalıcı sonuç veren klinik tavsiyesi?",
  },
  {
    id: "c9",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de kanal tedavisi sonrası takibi iyi yapan diş hekimi veya klinik önerisi?",
  },
  {
    id: "c10",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş teli fiyatları makul olan ve taksit imkânı sunan klinikler hangileri?",
  },
  {
    id: "c11",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de 20'lik diş çekimi için deneyimli ve ağrısız işlem yapan oral cerrah tavsiyesi?",
  },
  {
    id: "c12",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de estetik diş hekimliği (gülüş tasarımı) konusunda en iyi klinik hangisi?",
  },
  {
    id: "c13",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş taşı temizliği ve diş eti tedavisi için hijyenik klinik tavsiyesi?",
  },
  {
    id: "c14",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de protez diş yaptıranların memnun kaldığı klinikler hangileri?",
  },
  {
    id: "c15",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de hamilelik döneminde güvenle gidilebilecek diş kliniği önerisi var mı?",
  },
  {
    id: "c16",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş dolgusu fiyatları uygun ve kaliteli malzeme kullanan klinik hangisi?",
  },
  {
    id: "c17",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de ortodonti uzmanı diş hekimi tavsiyesi arayanlar için en iyi adres?",
  },
  {
    id: "c18",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş röntgeni ve tomografi çekimi hızlı yapılan klinikler hangileri?",
  },
  {
    id: "c19",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş eti çekilmesi tedavisi yapan deneyimli periodontist tavsiyesi?",
  },
  {
    id: "c20",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş hekimi randevusu kolay alınan ve bekleme süresi kısa klinik hangisi?",
  },
  {
    id: "c21",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş kliniği yorumları en olumlu olan merkezler hangileri?",
  },
  {
    id: "c22",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de lazer diş tedavisi uygulayan modern diş kliniği tavsiyesi?",
  },
  {
    id: "c23",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş hekimi fiyatları karşılaştırması yapanlar hangi kliniği tercih ediyor?",
  },
  {
    id: "c24",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş taşı temizliği kampanyası yapan güvenilir klinik var mı?",
  },
  {
    id: "c25",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş hekimi tavsiyesi arayan yeni taşınanlar için en iyi klinik hangisi?",
  },
  {
    id: "c26",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş implantı sonrası bakım ve kontrol süreci iyi yönetilen klinikler?",
  },
  {
    id: "c27",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş hekimi korkusu için uyku anestezisi (genel anestezi) uygulayan klinik?",
  },
  {
    id: "c28",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş çekimi sonrası iyileşme sürecinde destek veren klinik tavsiyesi?",
  },
  {
    id: "c29",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de diş hekimi seçerken sterilizasyon ve hijyen konusunda güven veren klinik?",
  },
  {
    id: "c30",
    sector: "clinic",
    tier: "pool",
    template:
      "[Şehir]'de aile hekimliği mantığıyla tüm aileye hizmet veren diş kliniği önerisi?",
  },
];

const HOTEL_QUESTIONS: QuestionTemplate[] = [
  {
    id: "h_gold_1",
    sector: "hotel",
    tier: "gold",
    template: "[Şehir]'deki en iyi otel hangisi?",
  },
  {
    id: "h_gold_2",
    sector: "hotel",
    tier: "gold",
    template:
      "[Şehir]'de konaklama fiyatları ve en yüksek puanlı kullanıcı yorumuna sahip oteller hangileri?",
  },
  {
    id: "h3",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de merkeze yakın, aileyle kalınabilecek en güvenilir otel tavsiyesi hangisi?",
  },
  {
    id: "h4",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de kahvaltı dahil fiyat-performans oteli öneren var mı?",
  },
  {
    id: "h5",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de spa ve wellness imkânı olan lüks otel tavsiyesi?",
  },
  {
    id: "h6",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de havalimanına yakın konaklama için en pratik otel hangisi?",
  },
  {
    id: "h7",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de evcil hayvan kabul eden pet friendly otel var mı?",
  },
  {
    id: "h8",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de balayı çiftleri için romantik otel ve suit tavsiyesi?",
  },
  {
    id: "h9",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de iş seyahati için sessiz ve hızlı Wi-Fi sunan otel önerisi?",
  },
  {
    id: "h10",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de deniz manzaralı otel arayanlar için en iyi seçenekler hangileri?",
  },
  {
    id: "h11",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de termal otel ve kaplıca deneyimi için güvenilir tesis tavsiyesi?",
  },
  {
    id: "h12",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de çocuklu aileler için oyun alanı ve aquapark olan otel hangisi?",
  },
  {
    id: "h13",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de ucuz ama temiz hostel veya pansiyon tavsiyesi arayanlar için?",
  },
  {
    id: "h14",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de otel fiyatları uygun olan ve iptal politikası esnek tesisler?",
  },
  {
    id: "h15",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de tarihi merkezde konaklama için en iyi otel hangisi?",
  },
  {
    id: "h16",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de otopark sorunu olmayan merkezi otel tavsiyesi?",
  },
  {
    id: "h17",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de all inclusive her şey dahil otel deneyimi için öneri?",
  },
  {
    id: "h18",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de konferans ve toplantı düzenlemek için otel salonu olan tesisler?",
  },
  {
    id: "h19",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de gece geç saatte check-in kolay olan otel hangisi?",
  },
  {
    id: "h20",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de uzun süreli konaklama için apart otel veya residence tavsiyesi?",
  },
  {
    id: "h21",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de kayak ve kış tatili oteli önerisi arayanlar için en iyi adres?",
  },
  {
    id: "h22",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de vegan kahvaltı seçeneği sunan butik otel var mı?",
  },
  {
    id: "h23",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de engelli erişimine uygun otel tavsiyesi arayanlar için?",
  },
  {
    id: "h24",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de gece hayatına yakın ama odaları sessiz otel hangisi?",
  },
  {
    id: "h25",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de jakuzi ve özel balkonlu suit odası olan otel tavsiyesi?",
  },
  {
    id: "h26",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de hafta sonu kaçamağı için şehir oteli önerisi arayanlar için?",
  },
  {
    id: "h27",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de otel temizliği ve hijyen konusunda en çok övülen tesisler?",
  },
  {
    id: "h28",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de grup rezervasyonu ve düğün konaklaması için uygun otel hangisi?",
  },
  {
    id: "h29",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de erken rezervasyon indirimi sunan en iyi oteller hangileri?",
  },
  {
    id: "h30",
    sector: "hotel",
    tier: "pool",
    template:
      "[Şehir]'de butik otel arayanlar için merkeze yürüme mesafesinde konforlu tesis tavsiyesi?",
  },
];

const RESTAURANT_QUESTIONS: QuestionTemplate[] = [
  {
    id: "r_gold_1",
    sector: "restaurant",
    tier: "gold",
    template: "[Şehir]'deki en iyi restoran hangisi?",
  },
  {
    id: "r_gold_2",
    sector: "restaurant",
    tier: "gold",
    template:
      "[Şehir]'de ne yenir, akşam yemeği için gidilecek en popüler yerel mekanlar neresi?",
  },
  {
    id: "r3",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de yöresel lezzetleri en temiz ve lezzetli sunan restoran tavsiyeleri hangileri?",
  },
  {
    id: "r4",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de en iyi kebapçı hangisi? Yerel halkın gittiği mekan arıyorum.",
  },
  {
    id: "r5",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de romantik akşam yemeği için en güzel restoran tavsiyesi?",
  },
  {
    id: "r6",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de çocuklu aileler için uygun menü ve ortam sunan restoran hangisi?",
  },
  {
    id: "r7",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de glütensiz ve vejetaryen seçenekleri bol restoran önerisi?",
  },
  {
    id: "r8",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de kahvaltı ve brunch mekanı olarak en popüler yer hangisi?",
  },
  {
    id: "r9",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de doğum günü kutlaması için özel masa düzenleyen restoran tavsiyesi?",
  },
  {
    id: "r10",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de deniz ürünleri ve balık restoranı arayanlar için en iyi adres?",
  },
  {
    id: "r11",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de fiyat-performans açısından en iyi lokanta ve esnaf lokantası hangisi?",
  },
  {
    id: "r12",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de gece geç saate kadar açık restoran veya cafe tavsiyesi?",
  },
  {
    id: "r13",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de pizza ve İtalyan mutfağı için en lezzetli restoran hangisi?",
  },
  {
    id: "r14",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de sushi ve Uzak Doğu mutfağı sunan kaliteli restoran önerisi?",
  },
  {
    id: "r15",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de teras manzaralı restoran arayanlar için en iyi mekanlar?",
  },
  {
    id: "r16",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de vegan restoran ve bitki bazlı menü sunan cafe tavsiyesi?",
  },
  {
    id: "r17",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de iş yemeği için sessiz ve profesyonel ortam sunan restoran?",
  },
  {
    id: "r18",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de kahve ve tatlı konusunda en çok önerilen cafe hangisi?",
  },
  {
    id: "r19",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de et mangal ve steakhouse tavsiyesi arayanlar için en iyi seçenek?",
  },
  {
    id: "r20",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de sokak lezzetleri ve sokak yemekleri için en popüler duraklar?",
  },
  {
    id: "r21",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de iftar ve toplu yemek organizasyonu yapan restoran tavsiyesi?",
  },
  {
    id: "r22",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de restoran yorumları en yüksek puanlı mekanlar hangileri?",
  },
  {
    id: "r23",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de paket servis ve hızlı teslimat yapan en iyi restoran hangisi?",
  },
  {
    id: "r24",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de kahvaltı tabağı ve börek için en meşhur mekan tavsiyesi?",
  },
  {
    id: "r25",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de ocakbaşı ve mangal keyfi için en iyi restoran önerisi?",
  },
  {
    id: "r26",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de düğün yemeği ve catering hizmeti veren restoran tavsiyesi?",
  },
  {
    id: "r27",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de alkolsüz aile restoranı arayanlar için güvenilir mekan?",
  },
  {
    id: "r28",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de meze çeşitleri bol rakı balık restoranı hangisi?",
  },
  {
    id: "r29",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de restoran rezervasyonu kolay alınan ve servisi hızlı mekanlar?",
  },
  {
    id: "r30",
    sector: "restaurant",
    tier: "pool",
    template:
      "[Şehir]'de öğle yemeği menüsü uygun fiyatlı işyeri yakını restoran hangisi?",
  },
];

export const CORE_QUESTIONS: QuestionTemplate[] = [
  ...CLINIC_QUESTIONS,
  ...HOTEL_QUESTIONS,
  ...RESTAURANT_QUESTIONS,
];

export function isGoldCoreQuestion(question: QuestionTemplate): boolean {
  return question.tier === "gold";
}

export function getGoldCoreQuestions(
  sector: CoreQuestionSector,
): QuestionTemplate[] {
  return CORE_QUESTIONS.filter(
    (question) => question.sector === sector && question.tier === "gold",
  );
}

export function getPoolCoreQuestions(
  sector: CoreQuestionSector,
): QuestionTemplate[] {
  return CORE_QUESTIONS.filter(
    (question) => question.sector === sector && question.tier === "pool",
  );
}

export const MIN_CAMPAIGN_BUDGET = 100;
export const MAX_CAMPAIGN_BUDGET_LIMIT = 3000;

/** Altın GEO soruları için minimum günlük bütçe (TL). */
export const GOLD_QUESTION_BUDGET_THRESHOLD = 1000;

export function isGoldQuestionId(id: string): boolean {
  return id.includes("_gold_");
}

export function isGoldQuestionBudgetUnlocked(budget: number): boolean {
  return budget >= GOLD_QUESTION_BUDGET_THRESHOLD;
}

/** 100 TL → 2 soru, 1000 TL → 30 soru, 1200 TL → 38 soru, 3000 TL → 100 soru. */
export function calculateMaxQuestions(budget: number): number {
  if (budget < MIN_CAMPAIGN_BUDGET) {
    return 0;
  }

  if (budget <= 1000) {
    return Math.floor(2 + ((budget - 100) * (30 - 2)) / (1000 - 100));
  }

  return Math.floor(30 + ((budget - 1000) * (100 - 30)) / (3000 - 1000));
}

export function resolveBudgetUnlockHint(budget: number): string {
  const current = calculateMaxQuestions(budget);

  if (budget >= MAX_CAMPAIGN_BUDGET_LIMIT) {
    return "Maksimum soru limitine ulaştınız — tüm kemik soru havuzu açık.";
  }

  const nextBudget =
    budget <= 1000
      ? Math.min(budget + 50, 1000)
      : Math.min(budget + 100, MAX_CAMPAIGN_BUDGET_LIMIT);
  const next = calculateMaxQuestions(nextBudget);

  if (next > current) {
    return `+${nextBudget - budget} TL ile ${next - current} soru daha seçebilirsiniz.`;
  }

  return `${current} soru aktif — bütçeyi artırarak limiti yükseltin.`;
}
