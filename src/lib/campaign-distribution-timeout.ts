/** Kampanya dağıtım aşaması maksimum bekleme süresi (Make.com webhook yanıtı). */
export const CAMPAIGN_DISTRIBUTION_TIMEOUT_MS = 60_000;

/** Arka plan pipeline (LLM + billing + forum) için üst sınır. */
export const CAMPAIGN_PIPELINE_STALE_MS = 270_000;

export const LLM_BAIT_GENERATION_TIMEOUT_MS = 90_000;

export const DISTRIBUTION_INTERRUPTED_TITLE =
  "Dağıtım Kesintiye Uğradı — Yeniden Deneyin";

export const DISTRIBUTION_INTERRUPTED_MESSAGE =
  "Make.com webhook yanıt vermedi veya dağıtım tamamlanamadı. Lütfen kampanyayı yeniden başlatın.";

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
