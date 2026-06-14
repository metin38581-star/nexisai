export function buildAuthHeaders(
  accessToken: string | null | undefined,
): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export function buildAuthFetchInit(
  accessToken: string | null | undefined,
  init: RequestInit = {},
): RequestInit {
  return {
    ...init,
    credentials: "include",
    headers: {
      ...buildAuthHeaders(accessToken),
      ...(init.headers ?? {}),
    },
  };
}
