import "server-only";

import {
  isInternalJobAuthorized,
  resolveInternalJobSecret,
} from "@/lib/internal-job-auth";

export function isCronAuthorized(request: Request): boolean {
  return isInternalJobAuthorized(request);
}

export function cronUnauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export { resolveInternalJobSecret };
