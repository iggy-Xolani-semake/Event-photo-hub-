/**
 * Only these two verified platform-owner identities may receive global admin
 * access. A role claim by itself is not sufficient: an ordinary tenant must
 * never become a cross-tenant administrator through metadata drift.
 */
export const APPROVED_ADMIN_EMAILS = [
  "xolanisemake@gmail.com",
  "xolanisemakework@gmail.com",
] as const;

export function isApprovedAdminEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  return Boolean(normalized && APPROVED_ADMIN_EMAILS.includes(normalized as (typeof APPROVED_ADMIN_EMAILS)[number]));
}

export function isApprovedAdminUser(user: {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
} | null | undefined): boolean {
  // Keep the explicit role requirement in the application as a second guard;
  // the email allowlist is what prevents any other account from becoming an
  // admin, while Supabase RLS enforces the same allowlist in SQL.
  return Boolean(
    user &&
      user.app_metadata?.role === "admin" &&
      isApprovedAdminEmail(user.email)
  );
}
