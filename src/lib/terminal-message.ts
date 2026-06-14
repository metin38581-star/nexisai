/** Terminal log mesajları için üst sınır; kırpma uygulanmaz, yalnızca dokümantasyon amaçlı. */
export const TERMINAL_MESSAGE_MAX_CHARS = 1000;

export function normalizeTerminalMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim();
}
