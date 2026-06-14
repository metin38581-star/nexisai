import type { TerminalLogEntry } from "@/types/campaign";

export function buildTahsilatLog(): TerminalLogEntry {
  return {
    id: "log-tahsilat",
    timestamp: new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    category: "TAHSİLAT",
    message:
      "Ödeme başarıyla onaylandı. NexisAI Reklam Kredisi tanımlandı. İşlem başlatılıyor...",
  };
}
