export interface AdminBusinessRow {
  userId: string;
  registeredAt: string;
  companyName: string;
  sector: string;
  sectorLabel: string;
  email: string;
  totalPaymentAmount: number;
  currency: string;
  campaignCount: number;
}

export interface AdminBaitPublication {
  id: string;
  baslik: string;
  slug: string;
  createdAt: string;
  liveUrl: string | null;
  externalLiveUrl: string | null;
  hubUrl: string;
}

export interface AdminIntentContentPair {
  intentId: string | null;
  question: string;
  simulatedAnswer: string;
  sortOrder: number;
  bait: AdminBaitPublication | null;
}

export interface AdminCampaignHistory {
  id: string;
  markaAdi: string;
  sehir: string;
  sektor: string;
  sectorLabel: string;
  gunlukButce: number;
  gunSayisi: number;
  totalCost: number;
  skor: number;
  agresiflik: string;
  makaleSayisi: number;
  createdAt: string;
  intentContentPairs: AdminIntentContentPair[];
}

export interface AdminPaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerStatusCode: string | null;
  description: string | null;
  campaignId: string | null;
  createdAt: string;
}

export interface AdminBusinessDetail {
  userId: string;
  registeredAt: string;
  email: string;
  companyName: string;
  sector: string;
  sectorLabel: string;
  totalPaymentAmount: number;
  currency: string;
  campaigns: AdminCampaignHistory[];
  payments: AdminPaymentRecord[];
}
