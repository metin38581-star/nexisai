"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { runDistributionSimulation } from "@/lib/distribution-core";
import type { DistributionProgressEvent } from "@/lib/distribution-core";

export type DistributionStatus = "idle" | "running" | "completed";

interface DistributionContextValue {
  status: DistributionStatus;
  progress: number;
  statusLabel: string;
  currentStep: number;
  totalSteps: number;
  startDistribution: (
    articleCount: number,
    sehir: string,
    sektor: string,
    onEvent?: (event: DistributionProgressEvent) => void,
  ) => Promise<void>;
  resetDistribution: () => void;
}

const DistributionContext = createContext<DistributionContextValue | null>(
  null,
);

function resolveStatusLabel(
  status: DistributionStatus,
  progress: number,
  currentStep: number,
  totalSteps: number,
): string {
  if (status === "idle") {
    return "Dağıtım bekleniyor";
  }

  if (status === "completed") {
    return "Dağıtım tamamlandı";
  }

  if (progress === 0) {
    return "Make.com webhook'una bağlanılıyor...";
  }

  if (progress === 100) {
    return "Son kontroller yapılıyor...";
  }

  return `Makale yayınlanıyor (${currentStep}/${totalSteps})`;
}

export function DistributionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DistributionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const runIdRef = useRef(0);

  const resetDistribution = useCallback(() => {
    runIdRef.current += 1;
    setStatus("idle");
    setProgress(0);
    setCurrentStep(0);
    setTotalSteps(0);
  }, []);

  const startDistribution = useCallback(
    async (
      articleCount: number,
      sehir: string,
      sektor: string,
      onEvent?: (event: DistributionProgressEvent) => void,
    ) => {
      if (articleCount <= 0) {
        return;
      }

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      setStatus("running");
      setProgress(0);
      setCurrentStep(0);
      setTotalSteps(articleCount);

      await runDistributionSimulation(
        articleCount,
        sehir,
        sektor,
        (event) => {
          if (runId !== runIdRef.current) {
            return;
          }

          setProgress(event.progress);
          setCurrentStep(event.currentIndex);
          setTotalSteps(event.totalCount);

          if (event.phase === "completed") {
            setStatus("completed");
          }

          onEvent?.(event);
        },
      );
    },
    [],
  );

  const statusLabel = resolveStatusLabel(
    status,
    progress,
    currentStep,
    totalSteps,
  );

  const value = useMemo(
    () => ({
      status,
      progress,
      statusLabel,
      currentStep,
      totalSteps,
      startDistribution,
      resetDistribution,
    }),
    [
      status,
      progress,
      statusLabel,
      currentStep,
      totalSteps,
      startDistribution,
      resetDistribution,
    ],
  );

  return (
    <DistributionContext.Provider value={value}>
      {children}
    </DistributionContext.Provider>
  );
}

export function useDistribution(): DistributionContextValue {
  const context = useContext(DistributionContext);

  if (!context) {
    throw new Error("useDistribution must be used within DistributionProvider");
  }

  return context;
}
