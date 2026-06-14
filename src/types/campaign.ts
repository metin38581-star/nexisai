import type { TurkishCitySlug } from "@/lib/turkey-cities";

export type BusinessSector =
  | "otel-konaklama"
  | "dis-klinigi-saglik"
  | "restoran-kafe"
  | "oto-galeri-otomotiv"
  | "guzellik-sac-salonu"
  | "e-ticaret-giyim";

export interface CampaignFormData {
  businessName: string;
  sector: BusinessSector;
  city: TurkishCitySlug;
  dailyBudget: number;
  campaignDays: number;
}

export interface CampaignApiRequest {
  markaAdi: string;
  sektor: string;
  sehir: string;
  gunlukButce: number;
  gunSayisi: number;
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
  metrics: CampaignMetrics;
  terminalLogs: TerminalLogEntry[];
  llmResult?: LlmInquiryResult;
  /** Arka planda üretilen gizli GEO yem sayısı; makale içerikleri istemciye gönderilmez. */
  baitsGenerated?: number;
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
  platform: string;
  yayinlandi: boolean;
  status: string;
  createdAt: string;
}

export interface StoredCampaign {
  id: string;
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
  createdAt: string;
  baits: StoredBait[];
}
