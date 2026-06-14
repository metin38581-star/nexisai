export interface CampaignBudgetParams {
  makaleSayisi: number;
  agresiflikSeviyesi: string;
  radarSikligiDakika: number;
  radarSikligi: string;
}

export function resolveCampaignBudgetParams(
  gunlukButce: number,
): CampaignBudgetParams {
  let makaleSayisi = 2;
  let agresiflikSeviyesi = "Düşük";
  let radarSikligiDakika = 1440;

  if (gunlukButce > 100) {
    makaleSayisi = 15;
    agresiflikSeviyesi = "Kritik Domination";
    radarSikligiDakika = 15;
  } else if (gunlukButce > 50) {
    makaleSayisi = 8;
    agresiflikSeviyesi = "Yüksek";
    radarSikligiDakika = 60;
  } else if (gunlukButce > 15) {
    makaleSayisi = 4;
    agresiflikSeviyesi = "Orta";
    radarSikligiDakika = 360;
  }

  return {
    makaleSayisi,
    agresiflikSeviyesi,
    radarSikligiDakika,
    radarSikligi: formatRadarSikligi(radarSikligiDakika),
  };
}

export function formatRadarSikligi(dakika: number): string {
  if (dakika < 60) {
    return `${dakika} Dakika`;
  }

  if (dakika < 1440) {
    const saat = Math.round(dakika / 60);
    return saat === 1 ? "1 Saat" : `${saat} Saat`;
  }

  return "24 Saat";
}

export function formatRadarLabel(dakika: number): string {
  if (dakika < 60) {
    return `${dakika} Dakikada Bir`;
  }

  if (dakika < 1440) {
    const saat = Math.round(dakika / 60);
    return saat === 1 ? "1 Saatte Bir" : `${saat} Saatte Bir`;
  }

  return "24 Saatte Bir";
}

export function radarIntervalMs(radarSikligiDakika: number): number {
  return radarSikligiDakika * 60 * 1000;
}

export function isCampaignDueForRadarScan(
  lastCheckedAt: Date | null | undefined,
  createdAt: Date,
  radarSikligiDakika: number,
  now = Date.now(),
): boolean {
  const anchorMs = (lastCheckedAt ?? createdAt).getTime();
  return now - anchorMs >= radarSikligiDakika * 60 * 1000;
}

export function computeNextRadarScanAt(
  lastCheckedAt: Date | null | undefined,
  createdAt: Date,
  radarSikligiDakika: number,
): Date {
  const anchorMs = (lastCheckedAt ?? createdAt).getTime();
  return new Date(anchorMs + radarSikligiDakika * 60 * 1000);
}
