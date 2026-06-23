"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CampaignFormData, CampaignResponse, LlmInquiryResult, StoredCampaign, TerminalLogEntry } from "@/types/campaign";
import {
  buildCampaignSession,
  clearCampaignSession,
  type CampaignSessionPayload,
} from "@/lib/campaign-session";
import { getCampaignMeta } from "@/lib/agresiflik";
import { buildTahsilatLog } from "@/lib/tahsilat-log";
import {
  DistributionProvider,
  useDistribution,
} from "@/context/DistributionContext";
import CampaignCreationStudio from "@/components/campaign/CampaignCreationStudio";
import DashboardHolographicPanel from "@/components/dashboard/DashboardHolographicPanel";
import AnalysisInsightsPanel from "@/components/dashboard/AnalysisInsightsPanel";
import DistributionStatusPanel from "@/components/dashboard/DistributionStatusPanel";
import CampaignHistoryPanel from "@/components/dashboard/CampaignHistoryPanel";
import CyberTerminal from "@/components/terminal/CyberTerminal";
import CyberWalletBar from "@/components/wallet/CyberWalletBar";
import TargetedQuestionsGrowthPanel from "@/components/campaign/TargetedQuestionsGrowthPanel";
import { useAuth } from "@/context/AuthContext";
import { buildAuthFetchInit } from "@/lib/auth-headers";
import { runCampaignPostOnce } from "@/lib/campaign-post-lock";

function formatLogTimestamp(): string {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const DUPLICATE_RECOVERY_WINDOW_MS = 120_000;

function normalizeMatchText(value: string): string {
  return value.trim().toLowerCase();
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
        terminalLogs: [
          {
            id: `recover-${Date.now()}`,
            timestamp: formatLogTimestamp(),
            category: "SİSTEM",
            message: inProgress
              ? `✓ [OTURUM]: ${payload.markaAdi} kampanyası işleniyor — operasyon devam ediyor.`
              : `✓ [OTURUM]: ${payload.markaAdi} kampanyası bulundu — operasyon devam ediyor.`,
          },
        ],
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
  handlers: {
    setActiveCampaignId: (id: string) => void;
    setLlmResult: (value: LlmInquiryResult | null) => void;
    setTerminalLogs: (logs: TerminalLogEntry[]) => void;
    setPendingDistribution: (value: {
      count: number;
      sehir: string;
      sektor: string;
    } | null) => void;
    onWalletRefresh?: () => void;
    runRadarScan: () => Promise<void>;
    fetchCampaigns: (options?: { silent?: boolean }) => Promise<void>;
  },
): void {
  if (result.campaignId) {
    handlers.setActiveCampaignId(result.campaignId);
  }
  if (result.llmResult) {
    handlers.setLlmResult(result.llmResult);
  }

  const logs: TerminalLogEntry[] = payload.withTahsilat
    ? [buildTahsilatLog(), ...(result.terminalLogs ?? [])]
    : (result.terminalLogs ?? []);
  handlers.setTerminalLogs(logs);

  const baitsGenerated =
    typeof result.baitsGenerated === "number" ? result.baitsGenerated : 0;

  if (baitsGenerated > 0) {
    handlers.setPendingDistribution({
      count: baitsGenerated,
      sehir: payload.sehir,
      sektor: payload.sektor,
    });
  }

  handlers.onWalletRefresh?.();
  void handlers.runRadarScan();
  void handlers.fetchCampaigns({ silent: true });
}

async function pollCampaignCompletion(
  token: string,
  payload: CampaignSessionPayload,
  campaignId: string,
  handlers: {
    setActiveCampaignId: (id: string) => void;
    setLlmResult: (value: LlmInquiryResult | null) => void;
    setTerminalLogs: (logs: TerminalLogEntry[]) => void;
    setPendingDistribution: (value: {
      count: number;
      sehir: string;
      sektor: string;
    } | null) => void;
    onWalletRefresh?: () => void;
    runRadarScan: () => Promise<void>;
    fetchCampaigns: (options?: { silent?: boolean }) => Promise<void>;
  },
): Promise<void> {
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
          terminalLogs: [
            {
              id: `poll-ready-${Date.now()}`,
              timestamp: formatLogTimestamp(),
              category: "SİSTEM",
              message: `✓ [OTURUM]: ${payload.markaAdi} kampanyası hazır — operasyon devam ediyor.`,
            },
          ],
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
  const [terminalLogs, setTerminalLogs] = useState<TerminalLogEntry[]>([]);
  const [llmResult, setLlmResult] = useState<LlmInquiryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [campaigns, setCampaigns] = useState<StoredCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [terminalSessionKey, setTerminalSessionKey] = useState(0);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const analysisInFlightRef = useRef(false);
  const growthLoopTriggeredRef = useRef<string | null>(null);
  const dashboardBootstrapRef = useRef<string | null>(null);
  const pendingDistributionRef = useRef<{
    count: number;
    sehir: string;
    sektor: string;
  } | null>(null);
  const distributionRunningRef = useRef(false);
  const runAnalysisRef = useRef<
    (payload: CampaignSessionPayload) => Promise<void>
  >(async () => undefined);
  const onPendingCampaignHandledRef = useRef(onPendingCampaignHandled);
  const accessTokenRef = useRef(accessToken);
  const userEmailRef = useRef(userEmail);
  const isLoggedInRef = useRef(isLoggedIn);
  const launchIdempotencyKeyRef = useRef<string | null>(null);

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
    try {
      const response = await fetch("/api/campaign/check-radar");
      if (response.ok) {
        const report = (await response.json()) as {
          scanLogs?: Array<{ status: string; message: string }>;
        };

        if (report.scanLogs?.length) {
          const radarTerminalLogs = report.scanLogs
            .filter((entry) => entry.status === "scanned")
            .map((entry, index) => ({
              id: `radar-${Date.now()}-${index}`,
              timestamp: formatLogTimestamp(),
              category: "ARAMA" as const,
              message: entry.message,
            }));

          if (radarTerminalLogs.length > 0) {
            setTerminalLogs((prev) => [...prev, ...radarTerminalLogs]);
          }
        }
      }
    } catch {
      // Radar arka planda sessizce çalışır.
    }
    await fetchCampaigns({ silent: true });
  }, [fetchCampaigns]);

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

  const appendDistributionLog = useCallback((message: string, id: string) => {
    setTerminalLogs((prev) => [
      ...prev,
      {
        id,
        timestamp: formatLogTimestamp(),
        category: "DAĞITIM",
        message,
      },
    ]);
  }, []);

  const runDistributionFlow = useCallback(async () => {
    const pending = pendingDistributionRef.current;
    if (!pending || pending.count <= 0) {
      setIsActive(false);
      return;
    }

    distributionRunningRef.current = true;
    pendingDistributionRef.current = null;

    await startDistribution(
      pending.count,
      pending.sehir,
      pending.sektor,
      (event) => {
        if (event.phase === "started" || event.phase === "publishing") {
          appendDistributionLog(
            event.terminalMessage,
            `dist-${event.phase}-${event.currentIndex}`,
          );
        }

        if (event.phase === "completed") {
          appendDistributionLog(
            event.terminalMessage,
            `dist-completed-${event.totalCount}`,
          );
        }
      },
    );

    distributionRunningRef.current = false;
  }, [appendDistributionLog, startDistribution]);

  const runAnalysis = useCallback(
    async (payload: CampaignSessionPayload) => {
      const token = accessTokenRef.current;
      const email = userEmailRef.current;

      if (!token) {
        analysisInFlightRef.current = false;
        setIsLoading(false);
        setTerminalLogs([
          {
            id: `error-${Date.now()}`,
            timestamp: formatLogTimestamp(),
            category: "SİSTEM",
            message:
              "⚠️ [OTURUM HATASI]: Kampanya oluşturmak için tekrar giriş yapmanız gerekiyor.",
          },
        ]);
        return;
      }

      resetDistribution();
      setTerminalLogs([]);
      setLlmResult(null);
      setTerminalSessionKey((key) => key + 1);
      pendingDistributionRef.current = null;
      distributionRunningRef.current = false;
      setIsLoading(true);
      setIsActive(true);

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
                sector: payload.sektor,
                city: payload.sehir,
                budget: payload.gunlukButce,
                campaignDays: payload.gunSayisi,
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
                const recoveryHandlers = {
                  setActiveCampaignId,
                  setLlmResult,
                  setTerminalLogs,
                  setPendingDistribution: (value: {
                    count: number;
                    sehir: string;
                    sektor: string;
                  } | null) => {
                    pendingDistributionRef.current = value;
                  },
                  onWalletRefresh,
                  runRadarScan: () => runRadarScanRef.current(),
                  fetchCampaigns: (options?: { silent?: boolean }) =>
                    fetchCampaignsRef.current(options),
                };

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

            setTerminalLogs([
              {
                id: `error-${Date.now()}`,
                timestamp: formatLogTimestamp(),
                category: isInsufficientBalance ? "HATA" : "SİSTEM",
                message: isInsufficientBalance
                  ? "⚠️ [SİBER KRİZ]: Yetersiz bakiye nedeniyle GEO Enjeksiyon Motoru bloke edildi. Lütfen bakiye yükleyin."
                  : isDuplicate
                    ? "⚠️ [KORUMA]: Yinelenen kampanya isteği engellendi. Operasyon zaten başlatıldı."
                    : isUnauthorized
                      ? "⚠️ [OTURUM HATASI]: Kampanya oluşturmak için tekrar giriş yapmanız gerekiyor."
                      : `⚠️ [SİBER HATA]: ${result.error ?? "Operasyon başlatılamadı."}`,
              },
            ]);

            resetDistribution();
            setIsActive(false);
            return;
          }

          if (result.success) {
            const successHandlers = {
              setActiveCampaignId,
              setLlmResult,
              setTerminalLogs,
              setPendingDistribution: (value: {
                count: number;
                sehir: string;
                sektor: string;
              } | null) => {
                pendingDistributionRef.current = value;
              },
              onWalletRefresh,
              runRadarScan: () => runRadarScanRef.current(),
              fetchCampaigns: (options?: { silent?: boolean }) =>
                fetchCampaignsRef.current(options),
            };

            applyCampaignSuccess(payload, result, successHandlers);

            if (result.inProgress && result.campaignId) {
              void pollCampaignCompletion(
                token,
                payload,
                result.campaignId,
                successHandlers,
              );
            }
            return;
          }

          setTerminalLogs([
            {
              id: `error-${Date.now()}`,
              timestamp: formatLogTimestamp(),
              category: "SİSTEM",
              message: `⚠️ [SİBER HATA]: ${result.error ?? "Beklenmeyen bir hata oluştu."}`,
            },
          ]);
          resetDistribution();
          setIsActive(false);
        });
      } catch {
        setTerminalLogs([
          {
            id: `error-${Date.now()}`,
            timestamp: formatLogTimestamp(),
            category: "SİSTEM",
            message: "⚠️ [SİBER HATA]: Bağlantı hatası. Lütfen tekrar deneyin.",
          },
        ]);
        resetDistribution();
        setIsActive(false);
      } finally {
        analysisInFlightRef.current = false;
        setIsLoading(false);
      }
    },
    [resetDistribution, onWalletRefresh],
  );

  useEffect(() => {
    runAnalysisRef.current = runAnalysis;
  }, [runAnalysis]);

  useEffect(() => {
    if (!activeCampaignId) {
      return;
    }

    if (growthLoopTriggeredRef.current === activeCampaignId) {
      return;
    }

    growthLoopTriggeredRef.current = activeCampaignId;
    void fetch("/api/cron/growth-loop", { method: "POST" }).catch(() => undefined);
  }, [activeCampaignId]);

  useEffect(() => {
    setSessionReady(true);
  }, []);

  const startCampaignAnalysis = useCallback((data: CampaignFormData) => {
    if (analysisInFlightRef.current) {
      return;
    }

    analysisInFlightRef.current = true;
    launchIdempotencyKeyRef.current = crypto.randomUUID();
    clearCampaignSession();
    const payload = buildCampaignSession(data);
    setSession(payload);
    void runAnalysisRef.current(payload);
  }, []);

  const handleFormSubmit = useCallback(
    (data: CampaignFormData) => {
      if (analysisInFlightRef.current || isLoading) {
        return;
      }

      if (!isLoggedIn || !userEmail) {
        onRequireAuth?.(data);
        return;
      }

      onPendingCampaignHandledRef.current?.();
      startCampaignAnalysis(data);
    },
    [startCampaignAnalysis, isLoading, isLoggedIn, userEmail, onRequireAuth],
  );

  const handleDraftApplied = useCallback(() => {
    onPendingCampaignHandledRef.current?.();
  }, []);

  const handleFlowComplete = useCallback(() => {
    if (pendingDistributionRef.current) {
      void runDistributionFlow();
      return;
    }

    if (distributionRunningRef.current || distributionStatus === "running") {
      return;
    }

    setIsActive(false);
  }, [distributionStatus, runDistributionFlow]);

  const activeMeta = session ? getCampaignMeta(session.gunlukButce) : null;

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
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
          <CyberTerminal
            key={terminalSessionKey}
            logs={terminalLogs}
            isActive={isActive}
            onFlowComplete={handleFlowComplete}
          />

          <div className="flex flex-col gap-5">
            <AnalysisInsightsPanel
              llmResult={llmResult}
              markaAdi={session.markaAdi}
              isLoading={isLoading}
            />
            <DistributionStatusPanel />
            <TargetedQuestionsGrowthPanel
              campaignId={activeCampaignId}
              brandName={session.markaAdi}
              accessToken={accessToken}
            />
          </div>
        </div>
      )}

      {!session && terminalLogs.length > 0 && (
        <div className="mb-10 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <CyberTerminal
            key={terminalSessionKey}
            logs={terminalLogs}
            isActive={false}
            onFlowComplete={() => undefined}
          />
        </div>
      )}

      <CampaignHistoryPanel
        campaigns={campaigns}
        isLoading={campaignsLoading}
      />
    </main>
  );
}
