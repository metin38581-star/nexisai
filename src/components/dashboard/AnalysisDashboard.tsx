"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { CampaignFormData, CampaignResponse, LlmInquiryResult, StoredCampaign, TerminalLogEntry } from "@/types/campaign";
import {
  buildCampaignSession,
  clearActiveCampaignId,
  clearCampaignSession,
  getActiveCampaignId,
  getCampaignSession,
  saveActiveCampaignId,
  saveCampaignSession,
  type CampaignSessionPayload,
} from "@/lib/campaign-session";
import { getCampaignMeta } from "@/lib/agresiflik";
import {
  DistributionProvider,
  useDistribution,
} from "@/context/DistributionContext";
import CampaignCreationStudio from "@/components/campaign/CampaignCreationStudio";
import DashboardHolographicPanel from "@/components/dashboard/DashboardHolographicPanel";
import AnalysisInsightsPanel from "@/components/dashboard/AnalysisInsightsPanel";
import CampaignOperationStatusPanel, {
  type CampaignOperationPhase,
} from "@/components/dashboard/CampaignOperationStatusPanel";
import DistributionStatusPanel from "@/components/dashboard/DistributionStatusPanel";
import CampaignHistoryPanel from "@/components/dashboard/CampaignHistoryPanel";
import CyberWalletBar from "@/components/wallet/CyberWalletBar";
import TargetedQuestionsGrowthPanel from "@/components/campaign/TargetedQuestionsGrowthPanel";
import { useAuth } from "@/context/AuthContext";
import { buildAuthFetchInit } from "@/lib/auth-headers";
import { runCampaignPostOnce } from "@/lib/campaign-post-lock";
import {
  CAMPAIGN_DISTRIBUTION_TIMEOUT_MS,
  DISTRIBUTION_INTERRUPTED_MESSAGE,
  DISTRIBUTION_INTERRUPTED_TITLE,
} from "@/lib/campaign-distribution-timeout";

const DUPLICATE_RECOVERY_WINDOW_MS = 120_000;
const DEFAULT_CHANNEL_COUNT = 7;
const CAMPAIGN_STATUS_POLL_INTERVAL_MS = 1500;
const CAMPAIGN_PIPELINE_MAX_WAIT_MS = 5 * 60_000;

interface CampaignFlowHandlers {
  setActiveCampaignId: (id: string) => void;
  setLlmResult: (value: LlmInquiryResult | null) => void;
  setAuthorityScore: (value: number | null) => void;
  setChannelCount: (value: number) => void;
  setOperationPhase: (phase: CampaignOperationPhase) => void;
  setOperationError: (value: string | null) => void;
  setPendingDistribution: (
    value: { count: number; sehir: string; sektor: string } | null,
  ) => void;
  triggerDistributionFlow: () => void;
  resetDistribution: () => void;
  onWalletRefresh?: () => void;
  runRadarScan: () => Promise<void>;
  fetchCampaigns: (options?: { silent?: boolean }) => Promise<void>;
}

function normalizeOperationError(message: string): string {
  return message
    .replace(/^⚠️\s*\[SİBER HATA\]:\s*/i, "")
    .replace(/^⚠️\s*\[OTURUM HATASI\]:\s*/i, "")
    .replace(/^⚠️\s*\[SİBER KRİZ\]:\s*/i, "")
    .trim();
}

function resolveAuthorityScore(
  result: Pick<CampaignResponse, "llmResult" | "metrics">,
): number | null {
  const score =
    result.llmResult?.confidence ??
    result.llmResult?.yapayZekaGorunurlukOrani ??
    result.metrics?.visibilityRate;

  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

function normalizeMatchText(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

async function recoverDuplicateCampaignResult(
  token: string,
  payload: CampaignSessionPayload,
): Promise<CampaignResponse | null> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 2000);
      });
    }

    try {
      const response = await fetch(
        "/api/campaigns",
        buildAuthFetchInit(token),
      );
      if (!response.ok) {
        continue;
      }

      const campaigns = (await response.json()) as StoredCampaign[];
      const match = campaigns.find((campaign) => {
        const createdAt = new Date(campaign.createdAt).getTime();
        if (Date.now() - createdAt > DUPLICATE_RECOVERY_WINDOW_MS) {
          return false;
        }

        const brandMatch =
          normalizeMatchText(campaign.markaAdi) ===
          normalizeMatchText(payload.markaAdi);
        const cityMatch =
          normalizeMatchText(campaign.sehir) ===
          normalizeMatchText(payload.sehir);

        if (!brandMatch || !cityMatch) {
          return false;
        }

        return true;
      });

      if (!match) {
        continue;
      }

      const baitCount = match.makaleSayisi || match.baits?.length || 0;
      const inProgress = baitCount === 0;

      return {
        success: true,
        campaignId: match.id,
        inProgress: inProgress,
        baitsGenerated: baitCount,
        metrics: {
          visibilityRate: match.skor,
          estimatedTraffic: 0,
          spentBudget: match.gunlukButce * match.gunSayisi,
          totalBudget: match.gunlukButce * match.gunSayisi,
        },
        terminalLogs: [],
        message: "Kampanya zaten başlatılmış.",
      };
    } catch {
      // Sonraki denemeye geç.
    }
  }

  return null;
}

function applyCampaignSuccess(
  payload: CampaignSessionPayload,
  result: CampaignResponse,
  handlers: CampaignFlowHandlers,
): void {
  if (result.campaignId) {
    handlers.setActiveCampaignId(result.campaignId);
    saveActiveCampaignId(result.campaignId);
  }
  if (result.llmResult) {
    handlers.setLlmResult(result.llmResult);
  }

  const authorityScore = resolveAuthorityScore(result);
  if (authorityScore !== null) {
    handlers.setAuthorityScore(authorityScore);
  }

  const baitsGenerated =
    typeof result.baitsGenerated === "number" ? result.baitsGenerated : 0;

  if (baitsGenerated > 0) {
    handlers.setChannelCount(Math.max(DEFAULT_CHANNEL_COUNT, baitsGenerated));
    handlers.setPendingDistribution({
      count: baitsGenerated,
      sehir: payload.sehir,
      sektor: payload.sektor,
    });
    handlers.triggerDistributionFlow();
    handlers.setOperationPhase("distributing");
  } else if (result.inProgress || result.status === "processing") {
    handlers.setOperationPhase("processing");
  } else {
    handlers.setOperationPhase("active");
  }

  handlers.onWalletRefresh?.();
  void handlers.runRadarScan();
  void handlers.fetchCampaigns({ silent: true });
}

async function pollCampaignProcessingStatus(
  token: string,
  payload: CampaignSessionPayload,
  campaignId: string,
  handlers: CampaignFlowHandlers,
): Promise<void> {
  handlers.setOperationPhase("processing");

  const startedAt = Date.now();

  while (Date.now() - startedAt < CAMPAIGN_PIPELINE_MAX_WAIT_MS) {
    await new Promise((resolve) => {
      window.setTimeout(resolve, CAMPAIGN_STATUS_POLL_INTERVAL_MS);
    });

    try {
      const response = await fetch(
        `/api/campaign/${campaignId}/status`,
        buildAuthFetchInit(token),
      );
      if (!response.ok) {
        continue;
      }

      const state = (await response.json()) as {
        status?: string;
        terminalLogs?: TerminalLogEntry[];
        result?: CampaignResponse | null;
        baitsGenerated?: number;
      };

      const logs = state.terminalLogs ?? [];

      if (state.status === "complete") {
        const baitsGenerated =
          state.baitsGenerated ??
          (typeof state.result?.baitsGenerated === "number"
            ? state.result.baitsGenerated
            : 0);

        applyCampaignSuccess(
          payload,
          {
            ...(state.result ?? {}),
            success: true,
            campaignId,
            status: "complete",
            baitsGenerated,
            terminalLogs: logs,
            metrics: state.result?.metrics ?? {
              visibilityRate: 0,
              estimatedTraffic: 0,
              spentBudget: 0,
              totalBudget: 0,
            },
            message:
              state.result?.message ??
              (baitsGenerated > 0
                ? "Kampanya tamamlandı."
                : "Operasyon tamamlandı."),
          },
          handlers,
        );
        clearActiveCampaignId();
        return;
      }

      if (state.status === "failed" || state.status === "interrupted") {
        clearActiveCampaignId();
        const errorLog = [...logs]
          .reverse()
          .find((entry) => entry.category === "HATA");
        const message =
          state.status === "interrupted"
            ? DISTRIBUTION_INTERRUPTED_MESSAGE
            : normalizeOperationError(
                errorLog?.message ?? "Operasyon tamamlanamadı.",
              );
        handlers.setOperationError(message);
        handlers.setOperationPhase(
          state.status === "interrupted" ? "interrupted" : "failed",
        );
        handlers.resetDistribution();
        toast.error(
          state.status === "interrupted"
            ? DISTRIBUTION_INTERRUPTED_TITLE
            : message,
        );
        return;
      }
    } catch {
      // Sonraki denemeye geç.
    }
  }

  handlers.setOperationError(DISTRIBUTION_INTERRUPTED_MESSAGE);
  handlers.setOperationPhase("interrupted");
  handlers.resetDistribution();
  clearActiveCampaignId();
  toast.error(DISTRIBUTION_INTERRUPTED_TITLE);
}

/** @deprecated Eski kampanya listesi polling — yedek */
async function pollCampaignCompletion(
  token: string,
  payload: CampaignSessionPayload,
  campaignId: string,
  handlers: CampaignFlowHandlers,
): Promise<void> {
  handlers.setOperationPhase("processing");

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 2000);
    });

    try {
      const response = await fetch(
        "/api/campaigns",
        buildAuthFetchInit(token),
      );
      if (!response.ok) {
        continue;
      }

      const campaigns = (await response.json()) as StoredCampaign[];
      const match = campaigns.find((campaign) => campaign.id === campaignId);
      if (!match) {
        continue;
      }

      const baitCount = match.makaleSayisi || match.baits?.length || 0;
      if (baitCount <= 0) {
        continue;
      }

      applyCampaignSuccess(
        payload,
        {
          success: true,
          campaignId: match.id,
          baitsGenerated: baitCount,
          metrics: {
            visibilityRate: match.skor,
            estimatedTraffic: 0,
            spentBudget: match.gunlukButce * match.gunSayisi,
            totalBudget: match.gunlukButce * match.gunSayisi,
          },
          terminalLogs: [],
        },
        handlers,
      );
      return;
    } catch {
      // Sonraki denemeye geç.
    }
  }
}

/** Strict Mode remount — bootstrap tekrar istek engeli. */
const dashboardModuleGuard = {
  bootstrapToken: null as string | null,
};

function shouldRunDashboardBootstrap(tokenKey: string): boolean {
  if (dashboardModuleGuard.bootstrapToken === tokenKey) {
    return false;
  }
  dashboardModuleGuard.bootstrapToken = tokenKey;
  return true;
}

export default function AnalysisDashboard({
  walletRefreshToken = 0,
  onWalletRefresh,
  pendingCampaign = null,
  onPendingCampaignHandled,
  onRequireAuth,
}: {
  walletRefreshToken?: number;
  onWalletRefresh?: () => void;
  pendingCampaign?: CampaignFormData | null;
  onPendingCampaignHandled?: () => void;
  onRequireAuth?: (data?: CampaignFormData) => void;
} = {}) {
  return (
    <DistributionProvider>
      <AnalysisDashboardContent
        walletRefreshToken={walletRefreshToken}
        onWalletRefresh={onWalletRefresh}
        pendingCampaign={pendingCampaign}
        onPendingCampaignHandled={onPendingCampaignHandled}
        onRequireAuth={onRequireAuth}
      />
    </DistributionProvider>
  );
}

function AnalysisDashboardContent({
  walletRefreshToken,
  onWalletRefresh,
  pendingCampaign,
  onPendingCampaignHandled,
  onRequireAuth,
}: {
  walletRefreshToken: number;
  onWalletRefresh?: () => void;
  pendingCampaign?: CampaignFormData | null;
  onPendingCampaignHandled?: () => void;
  onRequireAuth?: (data?: CampaignFormData) => void;
}) {
  const {
    startDistribution,
    resetDistribution,
    status: distributionStatus,
  } = useDistribution();
  const { accessToken, isAuthReady, isLoggedIn, userEmail } = useAuth();

  const [session, setSession] = useState<CampaignSessionPayload | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [llmResult, setLlmResult] = useState<LlmInquiryResult | null>(null);
  const [operationPhase, setOperationPhase] =
    useState<CampaignOperationPhase>("idle");
  const [operationError, setOperationError] = useState<string | null>(null);
  const [authorityScore, setAuthorityScore] = useState<number | null>(null);
  const [channelCount, setChannelCount] = useState(DEFAULT_CHANNEL_COUNT);
  const [isLoading, setIsLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<StoredCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const analysisInFlightRef = useRef(false);
  const dashboardBootstrapRef = useRef<string | null>(null);
  const pendingDistributionRef = useRef<{
    count: number;
    sehir: string;
    sektor: string;
  } | null>(null);
  const distributionRunningRef = useRef(false);
  const distributionAbortedRef = useRef(false);
  const operationStartedAtRef = useRef<number | null>(null);
  const runAnalysisRef = useRef<
    (payload: CampaignSessionPayload) => Promise<void>
  >(async () => undefined);
  const onPendingCampaignHandledRef = useRef(onPendingCampaignHandled);
  const accessTokenRef = useRef(accessToken);
  const userEmailRef = useRef(userEmail);
  const isLoggedInRef = useRef(isLoggedIn);
  const launchIdempotencyKeyRef = useRef<string | null>(null);
  const resumePollingRef = useRef(false);

  useEffect(() => {
    accessTokenRef.current = accessToken;
    userEmailRef.current = userEmail;
    isLoggedInRef.current = isLoggedIn;
  }, [accessToken, userEmail, isLoggedIn]);

  useEffect(() => {
    onPendingCampaignHandledRef.current = onPendingCampaignHandled;
  }, [onPendingCampaignHandled]);

  const fetchCampaigns = useCallback(async (options?: { silent?: boolean }) => {
    if (!accessToken) {
      setCampaigns([]);
      if (!options?.silent) {
        setCampaignsLoading(false);
      }
      return;
    }

    if (!options?.silent) {
      setCampaignsLoading(true);
    }
    try {
      const response = await fetch(
        "/api/campaigns",
        buildAuthFetchInit(accessToken),
      );
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as StoredCampaign[];
      setCampaigns(data);
    } catch {
      // Geçmiş operasyon listesi yüklenemedi; ana akış devam eder.
    } finally {
      if (!options?.silent) {
        setCampaignsLoading(false);
      }
    }
  }, [accessToken]);

  const runRadarScan = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    try {
      const response = await fetch(
        "/api/campaign/check-radar",
        buildAuthFetchInit(accessToken),
      );
      if (response.ok) {
        await response.json();
      }
    } catch {
      // Radar arka planda sessizce çalışır.
    }
    await fetchCampaigns({ silent: true });
  }, [accessToken, fetchCampaigns]);

  const fetchCampaignsRef = useRef(fetchCampaigns);
  const runRadarScanRef = useRef(runRadarScan);

  useEffect(() => {
    fetchCampaignsRef.current = fetchCampaigns;
    runRadarScanRef.current = runRadarScan;
  }, [fetchCampaigns, runRadarScan]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    const bootstrapKey = accessToken ?? "guest";
    if (
      dashboardBootstrapRef.current === bootstrapKey ||
      !shouldRunDashboardBootstrap(bootstrapKey)
    ) {
      return;
    }
    dashboardBootstrapRef.current = bootstrapKey;

    void (async () => {
      await fetchCampaignsRef.current();
      await runRadarScanRef.current();
    })();

    const intervalId = window.setInterval(() => {
      void runRadarScanRef.current();
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAuthReady, accessToken]);

  const runDistributionFlow = useCallback(async () => {
    const pending = pendingDistributionRef.current;
    if (!pending || pending.count <= 0) {
      if (!distributionAbortedRef.current) {
        setOperationPhase("active");
      }
      return;
    }

    distributionRunningRef.current = true;
    distributionAbortedRef.current = false;
    pendingDistributionRef.current = null;
    setOperationPhase("distributing");

    await startDistribution(pending.count, pending.sehir, pending.sektor);

    distributionRunningRef.current = false;

    if (distributionAbortedRef.current) {
      return;
    }

    setOperationPhase("active");
  }, [startDistribution]);

  const runDistributionFlowRef = useRef(runDistributionFlow);

  useEffect(() => {
    runDistributionFlowRef.current = runDistributionFlow;
  }, [runDistributionFlow]);

  const buildCampaignFlowHandlers = useCallback(
    (): CampaignFlowHandlers => ({
      setActiveCampaignId,
      setLlmResult,
      setAuthorityScore,
      setChannelCount,
      setOperationPhase,
      setOperationError,
      setPendingDistribution: (value) => {
        pendingDistributionRef.current = value;
      },
      triggerDistributionFlow: () => {
        void runDistributionFlowRef.current();
      },
      resetDistribution,
      onWalletRefresh,
      runRadarScan: () => runRadarScanRef.current(),
      fetchCampaigns: (options) => fetchCampaignsRef.current(options),
    }),
    [onWalletRefresh, resetDistribution],
  );

  const runAnalysis = useCallback(
    async (payload: CampaignSessionPayload) => {
      const token = accessTokenRef.current;
      const email = userEmailRef.current;

      if (!token) {
        analysisInFlightRef.current = false;
        setIsLoading(false);
        const message =
          "Kampanya oluşturmak için tekrar giriş yapmanız gerekiyor.";
        setOperationError(message);
        setOperationPhase("failed");
        toast.error(message);
        return;
      }

      resetDistribution();
      setLlmResult(null);
      setOperationError(null);
      setAuthorityScore(null);
      operationStartedAtRef.current = null;
      distributionAbortedRef.current = false;
      setChannelCount(DEFAULT_CHANNEL_COUNT);
      pendingDistributionRef.current = null;
      distributionRunningRef.current = false;
      setIsLoading(true);
      setOperationPhase("launching");

      try {
        await runCampaignPostOnce(async () => {
          const idempotencyKey =
            launchIdempotencyKeyRef.current ?? crypto.randomUUID();

          const response = await fetch(
            "/api/campaign",
            buildAuthFetchInit(token, {
              method: "POST",
              headers: {
                "Idempotency-Key": idempotencyKey,
              },
              body: JSON.stringify({
                companyName: payload.markaAdi,
                sector: payload.sectorSlug,
                sektor: payload.sektor,
                city: payload.sehir,
                budget: payload.gunlukButce,
                campaignDays: payload.gunSayisi,
                sectorSlug: payload.sectorSlug,
                selectedQuestionIds: payload.selectedQuestionIds,
                ...(payload.businessWebsite?.trim()
                  ? {
                      businessDomain: payload.businessWebsite.trim(),
                      businessWebsite: payload.businessWebsite.trim(),
                    }
                  : {}),
              }),
            }),
          );

          const result = (await response.json()) as CampaignResponse & {
            message?: string;
            error?: string;
          };

          if (!response.ok) {
            const isDuplicate =
              response.status === 429 &&
              typeof result.error === "string" &&
              result.error.toLowerCase().includes("duplicate");

            if (isDuplicate) {
              const recovered = await recoverDuplicateCampaignResult(
                token,
                payload,
              );
              if (recovered?.success) {
                const recoveryHandlers = buildCampaignFlowHandlers();

                applyCampaignSuccess(payload, recovered, recoveryHandlers);

                if (
                  recovered.campaignId &&
                  ((recovered.baitsGenerated ?? 0) === 0 || recovered.inProgress)
                ) {
                  void pollCampaignCompletion(
                    token,
                    payload,
                    recovered.campaignId,
                    recoveryHandlers,
                  );
                }
                return;
              }
            }

            if (
              response.status === 403 &&
              (result.error === "TRIAL_BUSINESS_BLOCKED" || result.message)
            ) {
              toast.error(
                result.message ??
                  "Bu işletme adı daha önce ücretsiz deneme hakkını kullanmıştır. Devam etmek için lütfen bakiye yükleyin.",
              );
            }

            if (response.status === 402 && result.requiresPayment) {
              toast.info(
                "Ödeme gerekiyor — iyzico sayfasına yönlendiriliyorsunuz...",
              );
              const payResponse = await fetch(
                "/api/payments/initialize",
                buildAuthFetchInit(token, {
                  method: "POST",
                  body: JSON.stringify({
                    amount: result.amountDue,
                    campaignDraft: result.campaignDraft,
                    buyerEmail: email,
                    buyerName: payload.markaAdi,
                  }),
                }),
              );
              const payResult = (await payResponse.json()) as {
                paymentPageUrl?: string;
                error?: string;
              };
              if (payResponse.ok && payResult.paymentPageUrl) {
                window.location.href = payResult.paymentPageUrl;
                return;
              }
              toast.error(payResult.error ?? "Ödeme başlatılamadı.");
            }

            const isInsufficientBalance =
              response.status === 400 &&
              typeof result.error === "string" &&
              (result.error.toLowerCase().includes("yetersiz") ||
                result.error.toLowerCase().includes("siber bakiye"));
            const isUnauthorized = response.status === 401;

            if (isDuplicate) {
              toast.info(
                "Kampanya isteği zaten işleniyor. Birkaç saniye bekleyip tekrar deneyin.",
              );
            }

            const errorMessage = isInsufficientBalance
              ? "Yetersiz bakiye nedeniyle operasyon başlatılamadı. Lütfen bakiye yükleyin."
              : isDuplicate
                ? "Operasyon zaten başlatıldı. Durum paneli birkaç saniye içinde güncellenir."
                : isUnauthorized
                  ? "Kampanya oluşturmak için tekrar giriş yapmanız gerekiyor."
                  : (result.error ?? "Operasyon başlatılamadı.");

            if (isDuplicate) {
              toast.info(
                "Kampanya isteği zaten işleniyor. Birkaç saniye bekleyip tekrar deneyin.",
              );
            } else {
              toast.error(errorMessage);
            }

            setOperationError(errorMessage);
            setOperationPhase("failed");
            resetDistribution();
            return;
          }

          if (result.success) {
            const successHandlers = buildCampaignFlowHandlers();

            applyCampaignSuccess(payload, result, successHandlers);

            if (
              result.campaignId &&
              (result.inProgress ||
                result.status === "started" ||
                result.status === "processing")
            ) {
              void pollCampaignProcessingStatus(
                token,
                payload,
                result.campaignId,
                successHandlers,
              );
            }
            return;
          }

          const unexpectedError = result.error ?? "Beklenmeyen bir hata oluştu.";
          setOperationError(unexpectedError);
          setOperationPhase("failed");
          toast.error(unexpectedError);
          resetDistribution();
        });
      } catch {
        const connectionError = "Bağlantı hatası. Lütfen tekrar deneyin.";
        setOperationError(connectionError);
        setOperationPhase("failed");
        toast.error(connectionError);
        resetDistribution();
      } finally {
        analysisInFlightRef.current = false;
        setIsLoading(false);
      }
    },
    [resetDistribution, onWalletRefresh, buildCampaignFlowHandlers],
  );

  useEffect(() => {
    runAnalysisRef.current = runAnalysis;
  }, [runAnalysis]);

  const isDistributionPending =
    operationPhase === "distributing" ||
    (operationPhase === "active" && distributionStatus === "running");

  useEffect(() => {
    if (!isDistributionPending) {
      operationStartedAtRef.current = null;
      return;
    }

    const startedAt = operationStartedAtRef.current ?? Date.now();
    operationStartedAtRef.current = startedAt;
    const remaining = Math.max(
      0,
      CAMPAIGN_DISTRIBUTION_TIMEOUT_MS - (Date.now() - startedAt),
    );

    const timerId = window.setTimeout(() => {
      distributionAbortedRef.current = true;
      distributionRunningRef.current = false;
      setOperationError(DISTRIBUTION_INTERRUPTED_MESSAGE);
      setOperationPhase("interrupted");
      resetDistribution();
      toast.error(DISTRIBUTION_INTERRUPTED_TITLE);
    }, remaining);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isDistributionPending, resetDistribution]);

  useEffect(() => {
    setSessionReady(true);
  }, []);

  useEffect(() => {
    if (
      !isAuthReady ||
      !accessToken ||
      analysisInFlightRef.current ||
      resumePollingRef.current
    ) {
      return;
    }

    const savedSession = getCampaignSession();
    const savedCampaignId = getActiveCampaignId();
    if (!savedSession || !savedCampaignId) {
      return;
    }

    resumePollingRef.current = true;
    setSession((current) => current ?? savedSession);

    void (async () => {
      try {
        const response = await fetch(
          `/api/campaign/${savedCampaignId}/status`,
          buildAuthFetchInit(accessToken),
        );
        if (!response.ok) {
          return;
        }

        const state = (await response.json()) as {
          status?: string;
        };

        if (
          state.status === "started" ||
          state.status === "processing"
        ) {
          setOperationPhase("processing");
          void pollCampaignProcessingStatus(
            accessToken,
            savedSession,
            savedCampaignId,
            buildCampaignFlowHandlers(),
          );
          return;
        }

        if (state.status === "complete") {
          clearActiveCampaignId();
        }
      } catch {
        // Sessiz — kullanıcı yeni kampanya başlatabilir.
      }
    })();
  }, [accessToken, buildCampaignFlowHandlers, isAuthReady]);

  const startCampaignAnalysis = useCallback((data: CampaignFormData) => {
    if (analysisInFlightRef.current) {
      return;
    }

    analysisInFlightRef.current = true;
    launchIdempotencyKeyRef.current = crypto.randomUUID();
    clearCampaignSession();
    const payload = buildCampaignSession(data);
    saveCampaignSession(payload);
    setSession(payload);
    void runAnalysisRef.current(payload);
  }, []);

  const handleFormSubmit = useCallback(
    (data: CampaignFormData) => {
      if (analysisInFlightRef.current || isLoading) {
        return;
      }

      if (!isLoggedIn || !accessToken) {
        onRequireAuth?.(data);
        return;
      }

      onPendingCampaignHandledRef.current?.();
      startCampaignAnalysis(data);
    },
    [startCampaignAnalysis, isLoading, isLoggedIn, accessToken, onRequireAuth],
  );

  const handleDraftApplied = useCallback(() => {
    onPendingCampaignHandledRef.current?.();
  }, []);

  const activeMeta = session ? getCampaignMeta(session.gunlukButce) : null;

  const displayPhase: CampaignOperationPhase = useMemo(() => {
    if (operationPhase === "failed" || operationPhase === "interrupted") {
      return operationPhase;
    }

    if (distributionStatus === "running" || distributionRunningRef.current) {
      if (operationPhase === "active") {
        return "distributing";
      }
      if (operationPhase === "idle") {
        return "launching";
      }
      return operationPhase;
    }

    if (isLoading) {
      return operationPhase === "idle" ? "launching" : operationPhase;
    }

    return operationPhase;
  }, [operationPhase, isLoading, distributionStatus]);

  if (!sessionReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
        Operasyon paneli yükleniyor...
      </div>
    );
  }

  return (
    <main className="relative z-10 mx-auto max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-violet-400 sm:text-xs sm:tracking-[0.25em]">
          Canlı Analiz Paneli
        </p>
        {session ? (
          <>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {session.markaAdi}{" "}
              <span className="text-gradient">GEO Tarama Merkezi</span>
            </h1>
            <p className="mt-3 text-sm text-zinc-400">
              {session.sehir} · {session.sektor} · Günlük bütçe{" "}
              {session.gunlukButce.toLocaleString("tr-TR")} ₺ · {session.gunSayisi}{" "}
              gün
            </p>
            {activeMeta && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border bg-zinc-950/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${activeMeta.renk}`}
                >
                  Agresiflik: {activeMeta.agresiflik}
                </span>
                <span
                  className={`inline-flex rounded-full border bg-zinc-950/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${activeMeta.renk}`}
                >
                  Radar: {activeMeta.radar}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              GEO Operasyon{" "}
              <span className="text-gradient">Komuta Merkezi</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Günlük bütçenizi ve operasyon sürenizi belirleyin; agresiflik
              seviyeniz otomatik ölçeklensin — 3.000 ₺/gün ile Kritik Domination
              moduna geçin.
            </p>
          </>
        )}
          </div>

          <CyberWalletBar
            refreshToken={walletRefreshToken}
            onRequireAuth={() => onRequireAuth?.()}
          />
        </div>
      </section>

      <section className="mb-8 sm:mb-10">
        <DashboardHolographicPanel>
          <CampaignCreationStudio
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
            draftForm={isLoggedIn ? pendingCampaign : null}
            onDraftApplied={handleDraftApplied}
          />
        </DashboardHolographicPanel>
      </section>

      {session && (
        <div className="mb-8 flex flex-col gap-6 sm:mb-10">
          <CampaignOperationStatusPanel
            markaAdi={session.markaAdi}
            sehir={session.sehir}
            phase={displayPhase}
            distributionStatus={distributionStatus}
            authorityScore={authorityScore}
            channelCount={channelCount}
            errorMessage={operationError}
          />

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <AnalysisInsightsPanel
              llmResult={llmResult}
              markaAdi={session.markaAdi}
              isLoading={isLoading}
            />
            <div className="flex flex-col gap-5">
              <DistributionStatusPanel />
              <TargetedQuestionsGrowthPanel
                campaignId={activeCampaignId}
                brandName={session.markaAdi}
                selectedCity={session.sehir}
                sectorSlug={session.sectorSlug}
                sectorLabel={session.sektor}
                selectedQuestionIds={session.selectedQuestionIds}
                accessToken={accessToken}
              />
            </div>
          </div>
        </div>
      )}

      <CampaignHistoryPanel
        campaigns={campaigns}
        isLoading={campaignsLoading}
      />
    </main>
  );
}
