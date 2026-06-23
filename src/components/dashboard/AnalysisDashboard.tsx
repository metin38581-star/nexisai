"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CampaignFormData, CampaignResponse, LlmInquiryResult, StoredCampaign, TerminalLogEntry } from "@/types/campaign";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
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

function formatLogTimestamp(): string {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const CAMPAIGN_REQUEST_DEBOUNCE_MS = 500;

function buildAnalysisRequestKey(payload: CampaignSessionPayload): string {
  return [
    payload.markaAdi.trim().toLowerCase(),
    payload.sehir.trim().toLowerCase(),
    payload.sektor.trim().toLowerCase(),
    payload.gunlukButce,
    payload.gunSayisi,
  ].join("|");
}

function buildPendingCampaignKey(data: CampaignFormData): string {
  return JSON.stringify({
    businessName: data.businessName.trim(),
    sector: data.sector,
    city: data.city,
    dailyBudget: data.dailyBudget,
    campaignDays: data.campaignDays,
  });
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
  const lastAnalysisRequestRef = useRef<{ key: string; at: number } | null>(
    null,
  );
  const pendingCampaignHandledRef = useRef<string | null>(null);
  const growthLoopTriggeredRef = useRef<string | null>(null);
  const dashboardBootstrapRef = useRef<string | null>(null);
  const pendingDistributionRef = useRef<{
    count: number;
    sehir: string;
    sektor: string;
  } | null>(null);
  const distributionRunningRef = useRef(false);

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
    if (dashboardBootstrapRef.current === bootstrapKey) {
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
      const requestKey = buildAnalysisRequestKey(payload);
      const now = Date.now();
      const lastRequest = lastAnalysisRequestRef.current;

      if (analysisInFlightRef.current) {
        return;
      }

      if (
        lastRequest &&
        lastRequest.key === requestKey &&
        now - lastRequest.at < CAMPAIGN_REQUEST_DEBOUNCE_MS
      ) {
        return;
      }

      lastAnalysisRequestRef.current = { key: requestKey, at: now };
      analysisInFlightRef.current = true;
      resetDistribution();
      setTerminalLogs([]);
      setLlmResult(null);
      setTerminalSessionKey((key) => key + 1);
      pendingDistributionRef.current = null;
      distributionRunningRef.current = false;
      setIsLoading(true);
      setIsActive(true);

      try {
        const response = await fetch(
          "/api/campaign",
          buildAuthFetchInit(accessToken, {
            method: "POST",
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
        };

        if (!response.ok) {
          analysisInFlightRef.current = false;

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
            toast.info("Ödeme gerekiyor — iyzico sayfasına yönlendiriliyorsunuz...");
            const payResponse = await fetch(
              "/api/payments/initialize",
              buildAuthFetchInit(accessToken, {
                method: "POST",
                body: JSON.stringify({
                  amount: result.amountDue,
                  campaignDraft: result.campaignDraft,
                  buyerEmail: userEmail,
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

          const isDuplicate =
            response.status === 429 &&
            typeof result.error === "string" &&
            result.error.toLowerCase().includes("duplicate");
          const isInsufficientBalance =
            response.status === 400 &&
            typeof result.error === "string" &&
            (result.error.toLowerCase().includes("yetersiz") ||
              result.error.toLowerCase().includes("siber bakiye"));
          const isUnauthorized = response.status === 401;

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
          setIsLoading(false);
          return;
        }

        if (result.success) {
          if (result.campaignId) {
            setActiveCampaignId(result.campaignId);
          }
          if (result.llmResult) {
            setLlmResult(result.llmResult);
          }

          const logs: TerminalLogEntry[] = payload.withTahsilat
            ? [buildTahsilatLog(), ...result.terminalLogs]
            : result.terminalLogs;
          setTerminalLogs(logs);

          const baitsGenerated =
            typeof result.baitsGenerated === "number"
              ? result.baitsGenerated
              : 0;

          if (baitsGenerated > 0) {
            pendingDistributionRef.current = {
              count: baitsGenerated,
              sehir: payload.sehir,
              sektor: payload.sektor,
            };
          }

          onWalletRefresh?.();
          void runRadarScan();
          void fetchCampaigns({ silent: true });
        } else {
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
        }
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
    [accessToken, resetDistribution, runRadarScan, onWalletRefresh, fetchCampaigns, userEmail],
  );

  const debouncedRunAnalysis = useDebouncedCallback(
    (payload: CampaignSessionPayload) => {
      void runAnalysis(payload);
    },
    CAMPAIGN_REQUEST_DEBOUNCE_MS,
  );

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

  const handleFormSubmit = useCallback(
    (data: CampaignFormData) => {
      if (analysisInFlightRef.current || isLoading) {
        return;
      }

      if (!isLoggedIn || !userEmail) {
        onRequireAuth?.(data);
        return;
      }

      debouncedRunAnalysis.cancel();

      clearCampaignSession();

      const payload = buildCampaignSession(data);
      setSession(payload);
      void runAnalysis(payload);
    },
    [
      runAnalysis,
      debouncedRunAnalysis,
      isLoading,
      isLoggedIn,
      userEmail,
      onRequireAuth,
    ],
  );

  useEffect(() => {
    if (!pendingCampaign || !isLoggedIn || !userEmail || !accessToken) {
      return;
    }

    const pendingKey = buildPendingCampaignKey(pendingCampaign);
    if (pendingCampaignHandledRef.current === pendingKey) {
      return;
    }

    pendingCampaignHandledRef.current = pendingKey;
    onPendingCampaignHandled?.();

    debouncedRunAnalysis.cancel();
    clearCampaignSession();

    const payload = buildCampaignSession(pendingCampaign);
    setSession(payload);
    void runAnalysis(payload);
  }, [
    pendingCampaign,
    isLoggedIn,
    userEmail,
    accessToken,
    onPendingCampaignHandled,
    runAnalysis,
    debouncedRunAnalysis,
  ]);

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
