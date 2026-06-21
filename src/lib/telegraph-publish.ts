import "server-only";

import { htmlToTelegraphNodes } from "@/lib/html-content-utils";

export interface TelegraphNode {
  tag: string;
  attrs?: Record<string, string>;
  children?: Array<string | TelegraphNode>;
}

export interface TelegraphCreatePageResponse {
  ok: boolean;
  url?: string;
  path?: string;
  error?: string;
  response?: unknown;
}

const TELEGRAPH_API = "https://api.telegra.ph";
const DEFAULT_AUTHOR = "NexisAI Radar";

let cachedAnonymousToken: string | null = null;

function resolveTelegraphAccessToken(): string | null {
  const envToken = process.env.TELEGRAPH_ACCESS_TOKEN?.trim();
  return envToken || cachedAnonymousToken;
}

async function createAnonymousTelegraphAccount(): Promise<string | null> {
  try {
    const shortName = `nexisai${Date.now().toString(36)}`;
    const response = await fetch(`${TELEGRAPH_API}/createAccount`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        short_name: shortName,
        author_name: DEFAULT_AUTHOR,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      result?: { access_token?: string };
    };

    if (!response.ok || payload.ok === false || !payload.result?.access_token) {
      console.error("[TELEGRAPH]: Anonim hesap oluşturulamadı:", payload);
      return null;
    }

    cachedAnonymousToken = payload.result.access_token;
    return cachedAnonymousToken;
  } catch (error) {
    console.error("[TELEGRAPH]: createAccount hatası:", error);
    return null;
  }
}

async function ensureTelegraphAccessToken(): Promise<string | null> {
  const existing = resolveTelegraphAccessToken();
  if (existing) {
    return existing;
  }
  return createAnonymousTelegraphAccount();
}

export function isTelegraphPublishConfigured(): boolean {
  return true;
}

/**
 * Telegra.ph — POST /createPage (sıfır izinli minimalist blog)
 * @see https://telegra.ph/api
 */
export async function publishToTelegraph(input: {
  title: string;
  htmlContent: string;
  authorName?: string;
  accessToken?: string;
}): Promise<TelegraphCreatePageResponse> {
  const accessToken =
    input.accessToken?.trim() || (await ensureTelegraphAccessToken());
  const authorName = input.authorName?.trim() || DEFAULT_AUTHOR;
  const content = htmlToTelegraphNodes(input.htmlContent);

  if (!accessToken) {
    return { ok: false, error: "TELEGRAPH_NO_ACCESS_TOKEN" };
  }
  try {
    const response = await fetch(`${TELEGRAPH_API}/createPage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_token: accessToken,
        title: input.title,
        author_name: authorName,
        content,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      result?: { url?: string; path?: string };
    };

    if (!response.ok || payload.ok === false) {
      const message = payload.error ?? `Telegra.ph HTTP ${response.status}`;
      console.error("[TELEGRAPH HATA]:", {
        status: response.status,
        message,
        title: input.title,
        response: payload,
      });
      return { ok: false, error: message, response: payload };
    }

    const url = payload.result?.url?.trim();
    console.log(`[TELEGRAPH BAŞARILI]: ${url ?? "(url yok)"}`);

    return {
      ok: true,
      url,
      path: payload.result?.path,
      response: payload,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Telegra.ph bağlantı hatası";

    console.error("[TELEGRAPH HATA]: İstek başarısız:", {
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

export async function distributeToTelegraph(
  title: string,
  content: string,
): Promise<TelegraphCreatePageResponse> {
  return publishToTelegraph({ title, htmlContent: content });
}
