/** Tarayıcı oturumunda eşzamanlı POST /api/campaign isteklerini engeller. */
let campaignPostInFlight: Promise<unknown> | null = null;

export function runCampaignPostOnce<T>(task: () => Promise<T>): Promise<T> {
  if (campaignPostInFlight) {
    return campaignPostInFlight as Promise<T>;
  }

  campaignPostInFlight = task().finally(() => {
    campaignPostInFlight = null;
  });

  return campaignPostInFlight as Promise<T>;
}
