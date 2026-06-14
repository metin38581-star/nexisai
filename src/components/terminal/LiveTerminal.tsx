"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TerminalLogEntry } from "@/types/campaign";

interface LiveTerminalProps {
  logs: TerminalLogEntry[];
  isActive: boolean;
  onFlowComplete?: () => void;
  onFlowProgress?: (progress: number) => void;
  contentHeightClassName?: string;
  embedded?: boolean;
}

interface RenderedLine {
  id: string;
  timestamp: string;
  category: string;
  displayedText: string;
  isComplete: boolean;
}

const TYPING_SPEED_MS = 28;
const LINE_PAUSE_MS = 420;
const INSTANT_DISPLAY_CATEGORIES = new Set(["TESPİT", "BAŞARI", "HATA"]);

const DEFAULT_LINE: RenderedLine = {
  id: "default",
  timestamp: "",
  category: "SİSTEM",
  displayedText:
    "NexisAI yapay zeka doğrulama sistemi hazır. Kampanya başlatmak için sol taraftaki formu doldurun.",
  isComplete: true,
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function shouldDisplayInstantly(log: TerminalLogEntry): boolean {
  return INSTANT_DISPLAY_CATEGORIES.has(log.category);
}

const CATEGORY_STYLES: Record<string, { label: string; text: string }> = {
  TAHSİLAT: { label: "text-amber-400", text: "text-amber-300" },
  AĞ: { label: "text-cyan-400", text: "text-cyan-300" },
  DAĞITIM: { label: "text-violet-400", text: "text-violet-300" },
  BAŞARI: { label: "text-emerald-400", text: "text-emerald-300" },
  HATA: {
    label: "text-red-400",
    text: "text-red-300 drop-shadow-[0_0_8px_rgba(248,113,113,0.45)]",
  },
  SİSTEM: { label: "text-purple-400", text: "text-emerald-400" },
};

function getCategoryStyle(category: string) {
  return (
    CATEGORY_STYLES[category] ?? {
      label: "text-purple-400",
      text: "text-emerald-400",
    }
  );
}

export default function LiveTerminal({
  logs,
  isActive,
  onFlowComplete,
  onFlowProgress,
  contentHeightClassName = "h-[320px]",
  embedded = false,
}: LiveTerminalProps) {
  const [lines, setLines] = useState<RenderedLine[]>([DEFAULT_LINE]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef(logs);
  const processedLogCountRef = useRef(0);
  const typingRunIdRef = useRef(0);
  const isTypingLoopActiveRef = useRef(false);
  const onFlowCompleteRef = useRef(onFlowComplete);
  const onFlowProgressRef = useRef(onFlowProgress);

  logsRef.current = logs;

  useEffect(() => {
    onFlowCompleteRef.current = onFlowComplete;
  }, [onFlowComplete]);

  useEffect(() => {
    onFlowProgressRef.current = onFlowProgress;
  }, [onFlowProgress]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  useEffect(() => {
    if (logs.length === 0) {
      typingRunIdRef.current += 1;
      processedLogCountRef.current = 0;
      isTypingLoopActiveRef.current = false;
      setIsTyping(false);
      setLines(isActive ? [] : [DEFAULT_LINE]);
      return;
    }

    if (logs.length < processedLogCountRef.current) {
      typingRunIdRef.current += 1;
      processedLogCountRef.current = 0;
      isTypingLoopActiveRef.current = false;
      setLines([]);
    }

    if (processedLogCountRef.current >= logs.length) {
      return;
    }

    if (isTypingLoopActiveRef.current) {
      return;
    }

    const runId = typingRunIdRef.current + 1;
    typingRunIdRef.current = runId;

    const runTypingFlow = async () => {
      if (processedLogCountRef.current === 0) {
        setLines([]);
      }
      isTypingLoopActiveRef.current = true;
      setIsTyping(true);

      while (
        processedLogCountRef.current < logsRef.current.length &&
        runId === typingRunIdRef.current
      ) {
        const index = processedLogCountRef.current;
        const log = logsRef.current[index];
        const lineId = log.id;
        const fullMessage = log.message;

        setLines((prev) => [
          ...prev,
          {
            id: lineId,
            timestamp: log.timestamp,
            category: log.category,
            displayedText: "",
            isComplete: false,
          },
        ]);

        await sleep(180);

        if (shouldDisplayInstantly(log)) {
          setLines((prev) =>
            prev.map((line) =>
              line.id === lineId
                ? {
                    ...line,
                    displayedText: fullMessage,
                    isComplete: true,
                  }
                : line,
            ),
          );
        } else {
          for (
            let charIndex = 0;
            charIndex <= fullMessage.length;
            charIndex++
          ) {
            if (runId !== typingRunIdRef.current) {
              return;
            }

            setLines((prev) =>
              prev.map((line) =>
                line.id === lineId
                  ? { ...line, displayedText: fullMessage.slice(0, charIndex) }
                  : line,
              ),
            );

            if (charIndex < fullMessage.length) {
              await sleep(TYPING_SPEED_MS);
            }
          }

          setLines((prev) =>
            prev.map((line) =>
              line.id === lineId
                ? {
                    ...line,
                    displayedText: fullMessage,
                    isComplete: true,
                  }
                : line,
            ),
          );
        }

        processedLogCountRef.current = index + 1;

        const progress =
          processedLogCountRef.current / logsRef.current.length;
        onFlowProgressRef.current?.(progress);

        if (processedLogCountRef.current < logsRef.current.length) {
          await sleep(LINE_PAUSE_MS);
        }
      }

      if (runId === typingRunIdRef.current) {
        isTypingLoopActiveRef.current = false;
        setIsTyping(false);
        onFlowCompleteRef.current?.();
      }
    };

    void runTypingFlow();
  }, [logs, isActive]);

  const showLiveIndicator = isActive || isTyping;

  const logPanel = (
      <div
        ref={scrollRef}
        className={`${contentHeightClassName} overflow-y-auto bg-zinc-950/80 p-5 font-mono text-[13px] leading-relaxed`}
      >
        {lines.length === 0 && isActive && (
          <span className="text-purple-400">
            [SİSTEM]: Bağlantı kuruluyor, lütfen bekleyin...
          </span>
        )}
        {lines.map((line) => {
          const style = getCategoryStyle(line.category);
          return (
            <div key={line.id} className="mb-1.5 break-words">
              {line.timestamp ? (
                <>
                  <span className="text-zinc-500">[{line.timestamp}]</span>
                  <span className="text-zinc-500"> - </span>
                  <span className={style.label}>[{line.category}]</span>
                  <span className={style.label}>: </span>
                  <span className={`${style.text} whitespace-pre-wrap`}>
                    {line.displayedText}
                  </span>
                  {!line.isComplete && (
                    <span className="ml-0.5 inline-block h-4 w-2 animate-terminal-blink bg-emerald-400" />
                  )}
                </>
              ) : (
                <span className="whitespace-pre-wrap text-emerald-400">
                  {line.displayedText}
                </span>
              )}
            </div>
          );
        })}
      </div>
  );

  if (embedded) {
    return <div className="h-full overflow-hidden">{logPanel}</div>;
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/5 bg-zinc-900/60 px-4 py-3">
        <WindowDot color="bg-red-500/80" glow="shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
        <WindowDot color="bg-yellow-500/80" glow="shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
        <WindowDot color="bg-green-500/80" glow="shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
        <span className="ml-3 text-xs font-medium text-zinc-500">
          Canlı Yapay Zeka Doğrulama Ekranı
        </span>
        {showLiveIndicator && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            Canlı
          </span>
        )}
      </div>
      {logPanel}
    </div>
  );
}

function WindowDot({ color, glow }: { color: string; glow: string }) {
  return (
    <span
      className={`h-3 w-3 rounded-full ${color} ${glow} transition-shadow duration-700`}
    />
  );
}
