"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { PasswordInput } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function establishRecoverySession() {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        } else if (tokenHash) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (otpError) {
            throw otpError;
          }
        }

        const { data } = await supabase.auth.getSession();

        if (active) {
          setReady(true);
          setSessionMissing(!data.session);
        }
      } catch {
        if (active) {
          setReady(true);
          setSessionMissing(true);
        }
      }
    }

    void establishRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setSessionMissing(!session);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("We could not update your password. Request a new recovery link and try again.");
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("Your password has been updated. You can now sign in with the new password.");
  }

  // Loading state: skeleton the card while the recovery token is exchanged.
  if (!ready) {
    return (
      <AuthLayout title="Choose a new password">
        <div className="space-y-4" role="status" aria-label="Verifying recovery link">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </AuthLayout>
    );
  }

  if (sessionMissing) {
    return (
      <AuthLayout title="Recovery link expired">
        <ErrorAlert title="We couldn't verify this recovery link">
          Recovery links are single-use and expire after a short while. Request a fresh one and
          try again.
        </ErrorAlert>
        <ButtonLink href="/forgot-password" className="mt-5 w-full">
          Request a new link
        </ButtonLink>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Pick something long and unique — at least 8 characters."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {message && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-200"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.2} />
            {message}
          </div>
        )}
        {error && <ErrorAlert title="Check the details below">{error}</ErrorAlert>}

        <PasswordInput
          label="New password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <PasswordInput
          label="Confirm new password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={
            confirmPassword.length > 0 && confirmPassword !== password
              ? "Passwords do not match yet."
              : null
          }
        />

        <Button type="submit" loading={loading} className="w-full">
          {loading ? "Updating password…" : "Update password"}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 block text-center text-sm text-slate-400 underline decoration-slate-700 underline-offset-4 transition-colors hover:text-white"
      >
        Back to sign in
      </Link>
    </AuthLayout>
  );
}
