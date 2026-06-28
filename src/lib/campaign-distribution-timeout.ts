/** Kampanya dağıtım aşaması maksimum bekleme süresi (Dev.to + Make.com + dominasyon ağı). */
export const CAMPAIGN_DISTRIBUTION_TIMEOUT_MS = 270_000;

/** Arka plan pipeline (LLM + billing + forum + dağıtım) için üst sınır. */
export const CAMPAIGN_PIPELINE_STALE_MS = 270_000;

export const LLM_BAIT_GENERATION_TIMEOUT_MS = 90_000;

export const DISTRIBUTION_INTERRUPTED_TITLE =
  "Dağıtım Kesintiye Uğradı — Yeniden Deneyin";

export const DISTRIBUTION_INTERRUPTED_MESSAGE =
  "Dağıtım kanalları zamanında yanıt vermedi veya operasyon tamamlanamadı. Lütfen kampanyayı yeniden başlatın.";

export class CampaignDistributionTimeoutError extends Error {
  constructor(message = DISTRIBUTION_INTERRUPTED_MESSAGE) {
    super(message);
    this.name = "CampaignDistributionTimeoutError";
  }
}

export function withCampaignDistributionTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = CAMPAIGN_DISTRIBUTION_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new CampaignDistributionTimeoutError());
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/** Dağıtım hatası/zaman aşımında ana kampanya akışını durdurmaz — fallback döner. */
export async function runDistributionWithGracefulFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  timeoutMs: number = CAMPAIGN_DISTRIBUTION_TIMEOUT_MS,
): Promise<T> {
  try {
    return await withCampaignDistributionTimeout(operation(), timeoutMs);
  } catch (error) {
    if (error instanceof CampaignDistributionTimeoutError) {
      console.warn(
        "[CAMPAIGN_DISTRIBUTION]: Dağıtım zaman aşımı — yerel hub yayını korunuyor.",
      );
    } else {
      console.error("[CAMPAIGN_DISTRIBUTION]: Dağıtım hatası yutuldu:", error);
    }
    return fallback;
  }
}
