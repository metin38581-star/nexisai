import "server-only";

import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { SimplePool } from "nostr-tools/pool";
import { WebSocket } from "ws";
import { buildNostrSummary } from "@/lib/html-content-utils";

export interface NostrPublishResult {
  ok: boolean;
  eventId?: string;
  publicKey?: string;
  relays?: string[];
  error?: string;
}

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
];

function resolveNostrRelays(): string[] {
  const raw = process.env.NOSTR_RELAYS?.trim();
  if (!raw) {
    return DEFAULT_RELAYS;
  }

  return raw
    .split(",")
    .map((relay) => relay.trim())
    .filter(Boolean);
}

export function isNostrPublishConfigured(): boolean {
  return resolveNostrRelays().length > 0;
}

function ensureNodeWebSocket(): void {
  if (typeof globalThis.WebSocket === "undefined") {
    globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
  }
}

function parseNostrPrivateKey(privateKey: string): Uint8Array {
  const trimmed = privateKey.trim();
  if (!trimmed) {
    return generateSecretKey();
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Uint8Array.from(trimmed.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  }

  return generateSecretKey();
}

/**
 * Nostr — kind:1 notu, özel anahtar ile imzalanır ve relay'lere gönderilir.
 */
export async function distributeToNostr(
  privateKey: string,
  content: string,
  relays?: string[],
): Promise<NostrPublishResult> {
  const relayList = relays?.length ? relays : resolveNostrRelays();

  if (relayList.length === 0) {
    return { ok: false, error: "NOSTR_NO_RELAYS" };
  }

  try {
    ensureNodeWebSocket();

    const secretKey = parseNostrPrivateKey(privateKey);
    const publicKey = getPublicKey(secretKey);

    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["t", "nexisai"], ["t", "llm-radar"]],
        content,
      },
      secretKey,
    );

    const pool = new SimplePool();
    const publishResults = await pool.publish(relayList, event);
    pool.close(relayList);

    const accepted = publishResults.some(Boolean);

    if (!accepted) {
      console.warn("[NOSTR UYARI]: Relay olayı reddetti.", {
        eventId: event.id,
        relays: relayList,
      });
      return {
        ok: false,
        eventId: event.id,
        publicKey,
        relays: relayList,
        error: "NOSTR_RELAY_REJECTED",
      };
    }

    console.log("[NOSTR BAŞARILI]:", { eventId: event.id, publicKey });

    return {
      ok: true,
      eventId: event.id,
      publicKey,
      relays: relayList,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nostr yayın hatası";

    console.error("[NOSTR HATA]:", {
      message,
      error:
        error instanceof Error
          ? { name: error.name, stack: error.stack }
          : error,
    });

    return { ok: false, error: message };
  }
}

/**
 * Nostr protokolü — kind:1 metin notu, rastgele anahtar çifti ile imzalanır.
 */
export async function publishToNostr(input: {
  title: string;
  htmlContent: string;
  hubUrl?: string;
  wordpressUrl?: string;
  relays?: string[];
}): Promise<NostrPublishResult> {
  const relays = input.relays?.length ? input.relays : resolveNostrRelays();

  if (relays.length === 0) {
    return { ok: false, error: "NOSTR_NO_RELAYS" };
  }

  try {
    ensureNodeWebSocket();

    const secretKey = generateSecretKey();
    const publicKey = getPublicKey(secretKey);
    const summary = buildNostrSummary(input.htmlContent, 220);

    const linkLines = [
      input.hubUrl ? `Hub: ${input.hubUrl}` : null,
      input.wordpressUrl ? `WordPress: ${input.wordpressUrl}` : null,
    ].filter(Boolean);

    const content = [
      `📡 NexisAI Radar — ${input.title}`,
      "",
      summary,
      ...(linkLines.length > 0 ? ["", ...linkLines] : []),
      "",
      "#NexisAI #LLM #GEO",
    ].join("\n");

    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["t", "nexisai"],
          ["t", "llm-radar"],
          ...(input.hubUrl ? [["r", input.hubUrl] as [string, string]] : []),
          ...(input.wordpressUrl
            ? [["r", input.wordpressUrl] as [string, string]]
            : []),
        ],
        content,
      },
      secretKey,
    );

    const pool = new SimplePool();
    const publishResults = await pool.publish(relays, event);
    pool.close(relays);

    const accepted = publishResults.some(Boolean);

    if (!accepted) {
      console.warn("[NOSTR UYARI]: Hiçbir relay olayı kabul etmedi.", {
        eventId: event.id,
        relays,
      });
      return {
        ok: false,
        eventId: event.id,
        publicKey,
        relays,
        error: "NOSTR_RELAY_REJECTED",
      };
    }

    console.log("[NOSTR BAŞARILI]:", {
      eventId: event.id,
      publicKey,
      relays: relays.filter((_, index) => publishResults[index]),
    });

    return {
      ok: true,
      eventId: event.id,
      publicKey,
      relays,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nostr yayın hatası";

    console.error("[NOSTR HATA]:", {
      title: input.title,
      message,
      error:
        error instanceof Error
          ? { name: error.name, stack: error.stack }
          : error,
    });

    return { ok: false, error: message };
  }
}
