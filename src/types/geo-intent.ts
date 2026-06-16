export interface GeoMicroIntent {
  id: string;
  question: string;
  simulatedAnswer: string;
}

export interface GeoIntentsApiResponse {
  intents: GeoMicroIntent[];
  sehir: string;
  sektor: string;
  markaAdi: string;
}

export interface SelectedGeoIntent {
  id: string;
  question: string;
  simulatedAnswer: string;
}

export interface GeoIntentsRequestBody {
  sehir: string;
  sektor: string;
  markaAdi: string;
  gunlukButce?: number;
  dailyBudget?: number;
}
