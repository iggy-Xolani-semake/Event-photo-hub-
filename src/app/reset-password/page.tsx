"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
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
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (tokenHash) {
        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
      }

      const { data } = await supabase.auth.getSession();
      if (active) {
        setReady(true);
        setSessionMissing(!data.session);
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
  }, [searchParams]);

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

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl">Event Photo Hub</p>
          <p className="mt-2 text-sm text-white/50">Choose a new admin password</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Reset password</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Use a password of at least 8 characters. This recovery link is temporary and should only be used by you.
          </p>

          {message && (
            <div role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </div>
          )}
          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          {!ready ? (
            <p className="mt-6 text-sm text-white/60">Checking your recovery link…</p>
          ) : sessionMissing && !message ? (
            <div className="mt-6 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm leading-6 text-white/80">
              This recovery link is missing or has expired. Request a new one from the password recovery page.
            </div>
          ) : !message ? (
            <form onSubmit={handleSubmit} className="mt-6">
              <label htmlFor="new-password" className="block text-sm text-white/70">New password</label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />

              <label htmlFor="confirm-password" className="mt-4 block text-sm text-white/70">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />

              <button
                type="submit"
                disabled={loading}
                className="tap-target mt-6 w-full rounded-xl bg-accent px-6 py-3 font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating password…" : "Update password"}
              </button>
            </form>
          ) : null}

          <div className="mt-5 text-center text-sm">
            <Link href="/admin/login" className="text-white/60 underline decoration-white/20 underline-offset-4 hover:text-white">
              Go to admin login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
