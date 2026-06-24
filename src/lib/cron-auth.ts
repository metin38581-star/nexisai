import "server-only";

export function isCronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export function cronUnauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
