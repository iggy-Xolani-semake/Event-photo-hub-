"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (resetError) {
      setError(`We could not send the recovery email: ${resetError.message}`);
      return;
    }

    setMessage("If an account exists for that email address, a recovery link is on its way.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl">Event Photo Hub</p>
          <p className="mt-2 text-sm text-white/50">Reset your admin password</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Forgot your password?</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Enter the email address used for your admin account. We will send you a secure link to choose a new password.
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

          <label htmlFor="recovery-email" className="mt-6 block text-sm text-white/70">Email</label>
          <input
            id="recovery-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />

          <button
            type="submit"
            disabled={loading}
            className="tap-target mt-6 w-full rounded-xl bg-accent px-6 py-3 font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending link…" : "Send recovery link"}
          </button>

          <Link href="/admin/login" className="mt-5 block text-center text-sm text-white/60 underline decoration-white/20 underline-offset-4 hover:text-white">
            Back to admin login
          </Link>
        </form>
      </section>
    </main>
  );
}
