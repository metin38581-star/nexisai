"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CampaignFormData, LlmInquiryResult, StoredCampaign, TerminalLogEntry } from "@/types/campaign";
import {
  buildCampaignSession,
  getCampaignSession,
  saveCampaignSession,
  type CampaignSessionPayload,
} from "@/lib/campaign-session";
import { getCampaignMeta } from "@/lib/agresiflik";
import { buildTahsilatLog } from "@/lib/tahsilat-log";
import {
  DistributionProvider,
  useDistribution,
} from "@/context/DistributionContext";
import CampaignCreationStudio from "@/components/campaign/CampaignCreationStudio";
import AnalysisInsightsPanel from "@/components/dashboard/AnalysisInsightsPanel";
import DistributionStatusPanel from "@/components/dashboard/DistributionStatusPanel";
import CampaignHistoryPanel from "@/components/dashboard/CampaignHistoryPanel";
import CyberTerminal from "@/components/terminal/CyberTerminal";
import CyberWalletBar from "@/components/wallet/CyberWalletBar";
import { useAuth } from "@/context/AuthContext";
import { buildAuthFetchInit } from "@/lib/auth-headers";

function formatLogTimestamp(): string {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AnalysisDashboard({
  walletRefreshToken = 0,
  onWalletRefresh,
}: {
  walletRefreshToken?: number;
  onWalletRefresh?: () => void;
} = {}) {
  return (
    <DistributionProvider>
      <AnalysisDashboardContent
        walletRefreshToken={walletRefreshToken}
        onWalletRefresh={onWalletRefresh}
      />
    </DistributionProvider>
  );
}

function AnalysisDashboardContent({
  walletRefreshToken,
  onWalletRefresh,
}: {
  walletRefreshToken: number;
  onWalletRefresh?: () => void;
}) {
  const {
    startDistribution,
    resetDistribution,
    status: distributionStatus,
  } = useDistribution();
  const { accessToken, isAuthReady } = useAuth();

  const [session, setSession] = useState<CampaignSessionPayload | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLogEntry[]>([]);
  const [llmResult, setLlmResult] = useState<LlmInquiryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [campaigns, setCampaigns] = useState<StoredCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [terminalSessionKey, setTerminalSessionKey] = useState(0);
  const hasAutoStartedRef = useRef(false);
  const pendingDistributionRef = useRef<{
    count: number;
    sehir: string;
    sektor: string;
  } | null>(null);
  const distributionRunningRef = useRef(false);

  const fetchCampaigns = useCallback(async (options?: { silent?: boolean }) => {
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

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    void fetchCampaigns();

    void runRadarScan();

    const intervalId = window.setInterval(() => {
      void runRadarScan();
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchCampaigns, isAuthReady, runRadarScan]);

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
              markaAdi: payload.markaAdi,
              sektor: payload.sektor,
              sehir: payload.sehir,
              gunlukButce: payload.gunlukButce,
              gunSayisi: payload.gunSayisi,
              selectedIntents: payload.selectedIntents,
              bonusIntentUnlocks: payload.bonusIntentUnlocks,
            }),
          }),
        );

        const result = await response.json();

        if (!response.ok) {
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
        setIsLoading(false);
      }
    },
    [accessToken, resetDistribution, runRadarScan, onWalletRefresh],
  );

  useEffect(() => {
    const payload = getCampaignSession();
    if (payload && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      setSession(payload);
      void runAnalysis(payload);
    }
    setSessionReady(true);
  }, [runAnalysis]);

  const handleFormSubmit = useCallback(
    (data: CampaignFormData) => {
      const payload = buildCampaignSession(data);
      saveCampaignSession(payload);
      setSession(payload);
      void runAnalysis(payload);
    },
    [runAnalysis],
  );

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
    <main className="relative z-10 mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
      <section className="mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-violet-400">
          Canlı Analiz Paneli
        </p>
        {session ? (
          <>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {session.markaAdi}{" "}
              <span className="text-gradient">GEO Tarama Merkezi</span>
            </h1>
            <p className="mt-3 text-sm text-zinc-400">
              {session.sehir} · {session.sektor} · Günlük bütçe $
              {session.gunlukButce.toLocaleString("en-US")} · {session.gunSayisi}{" "}
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
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              GEO Operasyon{" "}
              <span className="text-gradient">Komuta Merkezi</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Günlük bütçenizi ve operasyon sürenizi belirleyin; agresiflik
              seviyeniz otomatik ölçeklensin — $150/gün ile Kritik Domination
              moduna geçin.
            </p>
          </>
        )}
          </div>

          <CyberWalletBar refreshToken={walletRefreshToken} />
        </div>
      </section>

      <section className="mb-10">
        <CampaignCreationStudio
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
          accessToken={accessToken}
          walletRefreshToken={walletRefreshToken}
          onWalletRefresh={onWalletRefresh}
        />
      </section>

      {session && (
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
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
