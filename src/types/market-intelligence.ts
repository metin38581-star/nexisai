export interface MarketIntelligenceEntry {
  question: string;
  simulatedAnswer: string;
}

export interface MarketAnalyzeRequest {
  sehir: string;
  sektor: string;
  markaAdi: string;
}

export interface MarketAnalyzeResponse {
  success: boolean;
  intents: Array<{
    id: string;
    question: string;
    simulatedAnswer: string;
  }>;
  cached: boolean;
  source: "cache" | "gemini";
  sehir: string;
  sektor: string;
  markaAdi: string;
}

export interface RadarScanResultPayload {
  markaAdi: string;
  sehir: string;
  sektor: string;
  markaBulundu: boolean;
  feedback: string;
  geminiSnippet: string;
  scannedAt: string;
}
