import "server-only";

export interface MediumPublishInput {
  title: string;
  html: string;
  token?: string;
  userId?: string;
}

export interface MediumPublishResult {
  ok: boolean;
  url?: string;
  postId?: string;
  error?: string;
  statusCode?: number;
}

interface MediumPostResponse {
  data?: {
    id?: string;
    url?: string;
  };
  errors?: Array<{ message?: string; code?: number }>;
}

function resolveMediumCredentials(overrides?: {
  token?: string;
  userId?: string;
}): { token: string; userId: string } | null {
  const token =
    overrides?.token?.trim() ||
    process.env.MEDIUM_INTEGRATION_TOKEN?.trim() ||
    "";
  const userId =
    overrides?.userId?.trim() || process.env.MEDIUM_USER_ID?.trim() || "";

  if (!token || !userId) {
    return null;
  }

  return { token, userId };
}

export function isMediumPublishConfigured(): boolean {
  return resolveMediumCredentials() !== null;
}

/**
 * Medium resmi API — POST /v1/users/{userId}/posts
 * @see https://github.com/Medium/medium-api-docs
 */
export async function publishToMedium(
  input: MediumPublishInput,
): Promise<MediumPublishResult> {
  const credentials = resolveMediumCredentials({
    token: input.token,
    userId: input.userId,
  });

  if (!credentials) {
    console.warn(
      "[MEDIUM]: MEDIUM_INTEGRATION_TOKEN veya MEDIUM_USER_ID tanımlı değil — güvenli moda geçildi.",
    );
    return {
      ok: false,
      error: "MEDIUM_NOT_CONFIGURED",
    };
  }

  const endpoint = `https://api.medium.com/v1/users/${encodeURIComponent(credentials.userId)}/posts`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title: input.title,
        contentFormat: "html",
        content: input.html,
        publishStatus: "public",
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as MediumPostResponse;
    const mediumUrl = payload.data?.url?.trim();

    if (!response.ok || !mediumUrl) {
      const apiMessage =
        payload.errors?.[0]?.message ||
        `Medium API HTTP ${response.status}`;

      console.error("[MEDIUM HATA]:", {
        status: response.status,
        message: apiMessage,
        title: input.title,
      });

      return {
        ok: false,
        error: apiMessage,
        statusCode: response.status,
      };
    }

    console.log(`[MEDIUM BAŞARILI]: ${mediumUrl}`);

    return {
      ok: true,
      url: mediumUrl,
      postId: payload.data?.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Medium API bağlantı hatası";

    console.error("[MEDIUM HATA]: İstek başarısız:", message);

    return {
      ok: false,
      error: message,
    };
  }
}
