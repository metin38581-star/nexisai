export const DEFAULT_ADMIN_EMAILS = ["oktay38@gmail.com"];

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

export function isAdminEmail(
  email: string | null | undefined,
  envValue?: string,
): boolean {
  if (!email) {
    return false;
  }

  return getAdminEmailAllowlist(envValue).includes(email.trim().toLowerCase());
}

export function isAdminEmailClient(email: string | null | undefined): boolean {
  return isAdminEmail(
    email,
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS,
  );
}
