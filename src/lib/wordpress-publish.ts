import "server-only";

export interface WordPressPostResponse {
  id?: number;
  link?: string;
  status?: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
  message?: string;
  code?: string;
  [key: string]: unknown;
}

export interface WordPressPublishInput {
  title: string;
  /** HTML makale gövdesi */
  content: string;
  siteUrl?: string;
  username?: string;
  appPassword?: string;
}

export interface WordPressPublishResult {
  ok: boolean;
  url?: string;
  postId?: number;
  error?: string;
  statusCode?: number;
  /** WordPress REST API ham yanıtı */
  response?: WordPressPostResponse;
}

function resolveWordPressCredentials(overrides?: {
  siteUrl?: string;
  username?: string;
  appPassword?: string;
}): { siteUrl: string; username: string; appPassword: string } | null {
  const rawSiteUrl =
    overrides?.siteUrl?.trim() || process.env.WP_SITE_URL?.trim() || "";

  const siteUrl = rawSiteUrl
    .replace(/\/wp-json\/wp\/v2\/posts\/?$/i, "")
    .replace(/\/$/, "");

  const username =
    overrides?.username?.trim() || process.env.WP_USERNAME?.trim() || "";
  const appPassword = (
    overrides?.appPassword?.trim() ||
    process.env.WP_APP_PASSWORD?.trim() ||
    ""
  ).replace(/\s+/g, " ");

  if (!siteUrl || !username || !appPassword) {
    return null;
  }

  return { siteUrl, username, appPassword };
}

export function isWordPressPublishConfigured(): boolean {
  return resolveWordPressCredentials() !== null;
}

function buildBasicAuthHeader(username: string, appPassword: string): string {
  const token = Buffer.from(`${username}:${appPassword}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * WordPress REST API — POST /wp-json/wp/v2/posts
 * Basic Auth: Buffer.from(`${username}:${appPassword}`).toString('base64')
 *
 * @see https://developer.wordpress.org/rest-api/reference/posts/#create-a-post
 */
export async function publishToWordPress(
  title: string,
  content: string,
  overrides?: Omit<WordPressPublishInput, "title" | "content">,
): Promise<WordPressPublishResult>;
export async function publishToWordPress(
  input: WordPressPublishInput,
): Promise<WordPressPublishResult>;
export async function publishToWordPress(
  titleOrInput: string | WordPressPublishInput,
  content?: string,
  overrides?: Omit<WordPressPublishInput, "title" | "content">,
): Promise<WordPressPublishResult> {
  const input: WordPressPublishInput =
    typeof titleOrInput === "string"
      ? {
          title: titleOrInput,
          content: content ?? "",
          ...overrides,
        }
      : titleOrInput;

  const credentials = resolveWordPressCredentials({
    siteUrl: input.siteUrl,
    username: input.username,
    appPassword: input.appPassword,
  });

  if (!credentials) {
    console.warn(
      "[WORDPRESS]: WP_SITE_URL, WP_USERNAME veya WP_APP_PASSWORD tanımlı değil.",
    );
    return {
      ok: false,
      error: "WORDPRESS_NOT_CONFIGURED",
    };
  }

  const endpoint = `${credentials.siteUrl}/wp-json/wp/v2/posts`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: buildBasicAuthHeader(
          credentials.username,
          credentials.appPassword,
        ),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title: input.title,
        content: input.content,
        status: "publish",
      }),
    });

    const payload = (await response.json().catch(
      () => ({}),
    )) as WordPressPostResponse;
    const postUrl = payload.link?.trim();

    if (!response.ok) {
      const apiMessage =
        payload.message || `WordPress API HTTP ${response.status}`;

      console.error("[WORDPRESS HATA]:", {
        status: response.status,
        message: apiMessage,
        code: payload.code,
        title: input.title,
      });

      return {
        ok: false,
        error: apiMessage,
        statusCode: response.status,
        response: payload,
      };
    }

    console.log(`[WORDPRESS BAŞARILI]: ${postUrl ?? "(link yok)"}`);

    return {
      ok: true,
      url: postUrl,
      postId: payload.id,
      statusCode: response.status,
      response: payload,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "WordPress API bağlantı hatası";

    console.error("[WORDPRESS HATA]: İstek başarısız:", message);

    return {
      ok: false,
      error: message,
    };
  }
}
