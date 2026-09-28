"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Input } from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Client self-signup (V2 Sprint 2).
 *
 * Two things happen, and only the first is auth:
 *   1. Supabase creates the auth user.
 *   2. A clients row is created for them — via POST /api/account, which
 *      calls create_own_client_profile(). That function derives identity
 *      from the session, so this form cannot claim to be somebody else.
 *
 * Step 2 is also done lazily by /dashboard, because when Supabase email
 * confirmation is ON, signUp() returns no session and there is nothing to
 * attach a profile to yet. Doing it in both places means the client ends up
 * with exactly one profile either way.
 */
export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name.trim() || undefined },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }

    // No session means the project requires email confirmation — the profile
    // gets created on first sign-in instead.
    if (!data.session) {
      setNeedsConfirmation(true);
      setBusy(false);
      return;
    }

    const profileResponse = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!profileResponse.ok) {
      const profileBody = await profileResponse.json().catch(() => ({}));
      setError(profileBody.error ?? "Your account was created, but we could not finish setting up your workspace.");
      setBusy(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (needsConfirmation) {
    return (
      <AuthLayout title="Check your inbox">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
            <MailCheck className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <p className="mt-5 text-sm leading-relaxed text-slate-400">
            We sent a confirmation link to <span className="font-semibold text-white">{email}</span>.
            Open it to activate your account, then sign in and your dashboard will be waiting.
          </p>
          <ButtonLink href="/login" className="mt-6">
            Go to sign in
          </ButtonLink>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Collect photos from your guests with a QR code. No app for them to install."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorAlert title="We couldn't create your account">{error}</ErrorAlert>}

        <Input
          label="Your name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Thabo Mokoena"
          autoComplete="name"
        />

        <Input
          label="Email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <Input
          label="Password"
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          hint="At least 8 characters."
        />

        <Button type="submit" loading={busy} className="w-full">
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-300 transition-colors hover:text-indigo-200">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
