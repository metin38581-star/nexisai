import type { TurkishCitySlug } from "@/lib/turkey-cities";

export type BusinessSector =
  | "otel-konaklama"
  | "dis-klinigi-saglik"
  | "restoran-kafe"
  | "oto-galeri-otomotiv"
  | "guzellik-sac-salonu"
  | "e-ticaret-giyim";

export type CampaignFormSector = BusinessSector | "";
export type CampaignFormCity = TurkishCitySlug | "";

export interface CampaignFormData {
  businessName: string;
  sector: CampaignFormSector;
  city: CampaignFormCity;
  dailyBudget: number;
  campaignDays: number;
}

export interface CampaignApiRequest {
  companyName?: string;
  sector?: string;
  city?: string;
  budget?: number;
  campaignDays?: number;
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
  campaignId?: string;
  requiresPayment?: boolean;
  amountDue?: number;
  totalCost?: number;
  currentBalance?: number;
  campaignDraft?: CampaignApiRequest;
  message?: string;
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
