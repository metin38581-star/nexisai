import type { TurkishCitySlug } from "@/lib/turkey-cities";

export type BusinessSector =
  | "otel-konaklama"
  | "dis-klinigi-saglik"
  | "restoran-kafe"
  | "guzellik-estetik"
  | "hukuk-danismanlik"
  | "evden-eve-nakliyat"
  | "hali-yikama"
  | "oto-servis-ekspertiz"
  | "surucu-kursu"
  | "oto-galeri-otomotiv"
  | "guzellik-sac-salonu"
  | "egitim-kurs"
  | "dijital-ajans"
  | "e-ticaret-giyim";

export type CampaignFormSector = BusinessSector | "";
export type CampaignFormCity = TurkishCitySlug | "";

export interface CampaignFormData {
  businessName: string;
  businessWebsite?: string;
  sector: CampaignFormSector;
  city: CampaignFormCity;
  dailyBudget: number;
  campaignDays: number;
  selectedQuestionIds: string[];
}

export interface CampaignApiRequest {
  companyName?: string;
  businessWebsite?: string;
  businessDomain?: string;
  websiteUrl?: string;
  sector?: string;
  city?: string;
  budget?: number;
  campaignDays?: number;
  selectedQuestionIds?: string[];
  sectorSlug?: string;
  /** @deprecated Türkçe alan adları — geriye dönük uyumluluk */
  markaAdi?: string;
  sektor?: string;
  sehir?: string;
  gunlukButce?: number;
  gunSayisi?: number;
}

export interface CampaignMetrics {
  visibilityRate: number;
  estimatedTraffic: number;
  spentBudget: number;
  totalBudget: number;
}

export type TerminalLogCategory =
  | "TAHSİLAT"
  | "SİSTEM"
  | "ARAMA"
  | "ANALİZ"
  | "TESPİT"
  | "YEMLEME"
  | "AĞ"
  | "DAĞITIM"
  | "BAŞARI"
  | "HATA";

export interface TerminalLogEntry {
  id: string;
  timestamp: string;
  category: TerminalLogCategory;
  message: string;
}

export interface CampaignResponse {
  success: boolean;
  /** Asenkron kampanya durumu */
  status?: "started" | "processing" | "complete" | "failed" | "interrupted";
  campaignId?: string;
  requiresPayment?: boolean;
  paymentPageUrl?: string;
  amountDue?: number;
  totalCost?: number;
  currentBalance?: number;
  campaignDraft?: CampaignApiRequest;
  message?: string;
  /** Yinelenen istek — kampanya arka planda işleniyor. */
  inProgress?: boolean;
  metrics: CampaignMetrics;
  terminalLogs: TerminalLogEntry[];
  llmResult?: LlmInquiryResult;
  /** Arka planda üretilen gizli GEO yem sayısı; makale içerikleri istemciye gönderilmez. */
  baitsGenerated?: number;
  /** Make.com webhook'undan dönen dış platform URL'si (kampanya düzeyi). */
  liveUrl?: string;
  externalUrl?: string | null;
  nexisUrl?: string;
  /** NexisAI Hub iç yayın yolları. */
  hubArticles?: Array<{ slug: string; hubPath: string }>;
  /** Make.com dağıtım sonuçları. */
  distributionResults?: Array<{
    baitId: string;
    slug: string;
    ok: boolean;
    externalLiveUrl?: string;
  }>;
  error?: string;
}

export interface LlmInquiryResult {
  listed: boolean;
  suggestedRank: number;
  /** @deprecated Rakip listeleme kaldırıldı; her zaman boş dizi döner. */
  competitors: string[];
  confidence: number;
  yapayZekaGorunurlukOrani: number;
  analysisSummary: string;
  isLiveData: boolean;
  /** Google API zaman aşımı / bağlantı hatasında yerel veri katmanı devreye girdi. */
  usedLocalDataFallback?: boolean;
}

export interface StoredBait {
  id: string;
  userId: string;
  campaignId: string;
  baslik: string;
  icerik: string;
  slug: string;
  platform: string;
  yayinlandi: boolean;
  status: string;
  liveUrl: string | null;
  externalLiveUrl: string | null;
  createdAt: string;
}

export interface StoredCampaign {
  id: string;
  userId: string | null;
  sehir: string;
  sektor: string;
  markaAdi: string;
  skor: number;
  gunlukButce: number;
  gunSayisi: number;
  status?: string;
  totalPaid?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  agresiflik: string;
  makaleSayisi: number;
  radarSikligi: string;
  radarSikligiDakika: number;
  isOptimized: boolean;
  lastCheckedAt: string | null;
  llmFeedback: string | null;
  liveUrl: string | null;
  externalLiveUrl: string | null;
  wordpressUrl: string | null;
  createdAt: string;
  baits: StoredBait[];
}

/** Soru başına operasyonel maliyet (TL) — bütçe anayasası taban değeri. */
export const AUTOPILOT_OPERATION_COST_PER_QUESTION_TL = 500;

/** Bir üst soru hakkı için NexisAI tolerans jesti üst sınırı (TL). */
export const AUTOPILOT_TOLERANCE_GRANT_THRESHOLD_TL = 100;

/** Soru başına tahmini görünürlük artışı alt sınır (puan) — legacy export. */
export const AUTOPILOT_VISIBILITY_GAIN_PER_QUESTION_MIN = 1.0;

/** Soru başına tahmini görünürlük artışı üst sınır (puan) — legacy export. */
export const AUTOPILOT_VISIBILITY_GAIN_PER_QUESTION_MAX = 1.2;

/** @deprecated Eski delta tavanı — yeni eğri modeli min/max hedef oranları kullanır. */
export const AUTOPILOT_MAX_VISIBILITY_DELTA = 85;

/** En düşük bütçede bile garanti edilen minimum hedef önerilme oranı (%). */
export const AUTOPILOT_MIN_TARGET_RECOMMENDATION_RATE = 12;

/** Minimum hedef bandı üst sınırı (%) — seed ile %12–%15 arası. */
export const AUTOPILOT_MIN_TARGET_RECOMMENDATION_RATE_MAX = 15;

/** Tepe paketlerde psikolojik hedef tavan alt sınırı (%). */
export const AUTOPILOT_MAX_TARGET_RECOMMENDATION_RATE = 98;

/** Tepe paketlerde psikolojik hedef tavan üst sınırı (%). */
export const AUTOPILOT_MAX_TARGET_RECOMMENDATION_RATE_CEILING = 98;

/** Tepe paketlerde hedef bandı alt sınırı (%) — seed ile %96–%98 arası. */
export const AUTOPILOT_MAX_TARGET_RECOMMENDATION_RATE_FLOOR = 96;

/** Sektör başına gizli kemik soru havuzu kapasitesi. */
export const AUTOPILOT_BONE_QUESTION_POOL_SIZE = 50;

export type AutopilotInfrastructureChannel =
  | "nexis_qa"
  | "wordpress_pbn"
  | "devto"
  | "forum_external";

export type AutopilotDistributionPhase =
  | "immediate_index"
  | "sneaky_forum_cooldown";

export interface AutopilotBudgetInput {
  dailyBudget: number;
  totalDays: number;
}

export interface AutopilotBudgetResult {
  dailyBudget: number;
  totalDays: number;
  totalBudget: number;
  operationCostPerQuestion: number;
  basePublishCount: number;
  publishCount: number;
  toleranceApplied: boolean;
  toleranceGrantAmount: number;
  nextTierBudget: number;
  budgetShortfallToNextTier: number;
}

export interface AutopilotRecommendationMetrics {
  /** Mevcut yapay zeka önerilme oranı (%) — müşteriye gösterilir */
  baselineRecommendationRate: number;
  /** Tahmini hedef önerilme oranı (%) — müşteriye gösterilir */
  targetRecommendationRate: number;
  /** Kısa kurumsal başlık — soru/içerik adedi içermez */
  corporateSummary: string;
  /** Tam kurumsal anlatım cümlesi — soru/içerik adedi içermez */
  corporateNarrative: string;
}

/** Dahili görünürlük modeli — yalnızca sunucu tarafında tutulur. */
export interface AutopilotVisibilityForecastInternal {
  publishCount: number;
  visibilityDelta: number;
  averageGainPerQuestion: number;
  currentRecommendationRate: number;
  projectedRecommendationRate: number;
}

export interface AutopilotSelectedQuestion {
  questionId: string;
  sectorSlug: BusinessSector;
  renderedQuestion: string;
  selectionIndex: number;
}

export interface AutopilotDailyPublishPlan {
  campaignDayIndex: number;
  calendarDate: string;
  questionCount: number;
  questionIds: string[];
}

export interface AutopilotInfrastructurePayload {
  payloadId: string;
  questionId: string;
  channel: AutopilotInfrastructureChannel;
  phase: AutopilotDistributionPhase;
  scheduledAt: string;
  /** Dahili dağıtım motoru için — müşteriye asla gösterilmez */
  internalDispatch: {
    campaignId: string;
    brandName: string;
    city: string;
    sectorSlug: BusinessSector;
    contentTitle: string;
    contentBody: string;
  };
}

export interface AutopilotForumScheduleSlot {
  slotId: string;
  campaignDayIndex: number;
  scheduledAt: string;
  questionId: string;
  /** Harici forum anti-spam rotasyonu — dahili */
  accountProxyId: string;
  cooldownMinutesSincePrevious: number;
  queuePayload: {
    type: "forum_sneaky_publish";
    campaignId: string;
    questionId: string;
    proxyLane: string;
    jitterAppliedMinutes: number;
  };
}

export interface AutopilotSchedulerLogEntry {
  step: string;
  level: "info" | "warn" | "debug";
  message: string;
  at: string;
  meta?: Record<string, string | number | boolean>;
}

export interface AutopilotCampaignPlanInput {
  campaignId: string;
  brandName: string;
  city: string;
  sectorSlug: BusinessSector;
  dailyBudget: number;
  totalDays: number;
  startDate?: Date;
  businessDomain?: string | null;
  /** Ölçülmüş/simüle başlangıç oranı — yoksa kampanya seed ile simüle edilir */
  currentRecommendationRate?: number;
}

/** Dahili tam plan — link/log/payload detayları yalnızca sunucu tarafında kalır. */
export interface AutopilotCampaignPlanInternal {
  campaignId: string;
  budget: AutopilotBudgetResult;
  metrics: AutopilotRecommendationMetrics;
  visibilityForecast: AutopilotVisibilityForecastInternal;
  selectedQuestions: AutopilotSelectedQuestion[];
  dailyPlans: AutopilotDailyPublishPlan[];
  infrastructurePayloads: AutopilotInfrastructurePayload[];
  forumSchedule: AutopilotForumScheduleSlot[];
  logs: AutopilotSchedulerLogEntry[];
}

/** Müşteri / dashboard API yanıtı — yalnızca kurumsal skor metrikleri, teknik detay yok. */
export interface AutopilotCampaignPlanClientView {
  success: true;
  campaignId: string;
  metrics: AutopilotRecommendationMetrics;
  operationalSummary: {
    campaignDurationDays: number;
    totalInvestmentTL: number;
  };
}

export interface LiveVisibilityForecastRequest {
  businessName?: string;
  city?: string;
  sector?: BusinessSector | "";
  sectorSlug?: BusinessSector | "";
  dailyBudget?: number;
  campaignDays?: number;
  totalDays?: number;
  /** Debug: önbelleği atla ve canlı LLM'i zorla */
  skipCache?: boolean;
}

/** Canlı LLM startRate + bütçe eğrisi — teknik/LLM detayı içermez. */
export type LiveVisibilityForecastClientView = Omit<
  AutopilotCampaignPlanClientView,
  "campaignId"
>;
