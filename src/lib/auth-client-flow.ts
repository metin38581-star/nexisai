interface AuthRouter {
  push: (href: string) => void;
  refresh: () => void;
}

export interface AuthSessionPayload {
  userName: string;
  userEmail: string | null;
  userId: string;
  accessToken: string;
  refreshToken?: string | null;
}

export function isDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function navigateAfterAuthSuccess(
  router: AuthRouter,
  pathname: string,
): void {
  if (isDashboardPath(pathname)) {
    router.refresh();
    return;
  }

  router.push("/dashboard");
}
