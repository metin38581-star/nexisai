export const DEFAULT_SUPER_ADMIN_EMAIL = "sareasml38@hotmail.com";

export const DEFAULT_ADMIN_EMAILS = [DEFAULT_SUPER_ADMIN_EMAIL];

export function resolveSuperAdminEmail(): string {
  return (
    process.env.ADMIN_EMAIL?.trim().toLowerCase() ??
    DEFAULT_SUPER_ADMIN_EMAIL.toLowerCase()
  );
}

export function getAdminEmailAllowlist(envValue?: string): string[] {
  const raw = envValue?.trim();

  if (!raw) {
    return DEFAULT_ADMIN_EMAILS.map((email) => email.toLowerCase());
  }

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email) {
    return false;
  }

  return email.trim().toLowerCase() === resolveSuperAdminEmail();
}

export function isAdminEmail(
  email: string | null | undefined,
  envValue?: string,
): boolean {
  if (!email) {
    return false;
  }

  const normalized = email.trim().toLowerCase();

  if (isSuperAdminEmail(normalized)) {
    return true;
  }

  return getAdminEmailAllowlist(envValue).includes(normalized);
}

export function isAdminEmailClient(email: string | null | undefined): boolean {
  return isAdminEmail(
    email,
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS,
  );
}

export function isSuperAdminEmailClient(
  email: string | null | undefined,
): boolean {
  const configured =
    process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ??
    process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",")[0]?.trim().toLowerCase() ??
    DEFAULT_SUPER_ADMIN_EMAIL.toLowerCase();

  return Boolean(email && email.trim().toLowerCase() === configured);
}
