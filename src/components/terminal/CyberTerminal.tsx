"use client";

import LiveTerminal from "@/components/terminal/LiveTerminal";
import type { TerminalLogEntry } from "@/types/campaign";

interface CyberTerminalProps {
  logs: TerminalLogEntry[];
  isActive: boolean;
  onFlowComplete?: () => void;
  onFlowProgress?: (progress: number) => void;
}

export default function CyberTerminal({
  logs,
  isActive,
  onFlowComplete,
  onFlowProgress,
}: CyberTerminalProps) {
  return (
    <div className="relative h-full min-h-[640px]">
      <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-600/20 via-transparent to-emerald-500/20 blur-xl" />
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-violet-500/20 bg-zinc-950/90 shadow-[0_0_40px_rgba(124,58,237,0.12)]">
        <div className="border-b border-violet-500/10 bg-zinc-900/80 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-violet-400">
                NexisAI CMD
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">
                Canlı Analiz Terminali
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
          </div>
        </div>

        <div className="flex-1 p-1">
          <LiveTerminal
            logs={logs}
            isActive={isActive}
            onFlowComplete={onFlowComplete}
            onFlowProgress={onFlowProgress}
            contentHeightClassName="h-[540px]"
            embedded
          />
        </div>

        <div className="border-t border-violet-500/10 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] text-emerald-400/70">
          root@nexisai:~$ geo-scan --live --semantic-index --turkey-market
        </div>
      </div>
    </div>
  );
}
