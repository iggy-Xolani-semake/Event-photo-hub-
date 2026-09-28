import { KeyRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSettingsForm } from "@/components/dashboard/AccountSettingsForm";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { requireUser } from "@/lib/auth/requireUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Account Settings: the host's own profile (editable) plus the security
 * essentials — sign-in email, password reset, session sign-out. Identity is
 * read from the session; nothing here can edit another account.
 */
export default async function AccountSettingsPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/login?redirectTo=/dashboard/settings");
  }

  const supabase = await createSupabaseServerClient();
  const { data: clientRow } = await supabase
    .from("clients")
    .select("name, phone")
    .eq("auth_user_id", user.userId)
    .maybeSingle<{ name: string; phone: string | null }>();

  return (
    <div className="space-y-10">
      <PageHeader
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Account Settings" }]}
        title="Account Settings"
        description="How you appear to guests and on your event branding."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Host profile" description="Saved to your client profile." />
          <AccountSettingsForm
            initialName={clientRow?.name ?? ""}
            initialPhone={clientRow?.phone ?? ""}
          />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Sign-in" description="Your account email is your identity." />
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</dt>
                <dd className="truncate font-medium text-slate-200">{user.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Password
                </dt>
                <dd>
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-1.5 font-medium text-indigo-300 transition-colors hover:text-indigo-200"
                  >
                    <KeyRound className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Send reset link
                  </Link>
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Session" description="Sign out everywhere this browser is signed in." />
            <div className="flex flex-wrap gap-3">
              <SignOutButton />
              <ButtonLink href="/dashboard" variant="ghost">
                Back to events
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
