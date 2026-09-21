"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

  const inputClass =
    "w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 outline-none focus:border-accent";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl block mb-8">
          Memora
        </Link>

        {needsConfirmation ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h1 className="font-display text-2xl mb-2">Check your inbox</h1>
            <p className="text-white/60 text-sm leading-relaxed">
              We sent a confirmation link to <span className="text-white">{email}</span>. Open it
              to activate your account, then sign in and your dashboard will be waiting.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block bg-accent text-ink-950 font-semibold rounded-lg px-5 py-2.5 text-sm"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl mb-2">Create your account</h1>
            <p className="text-white/50 text-sm mb-8">
              Collect photos from your guests with a QR code. No app for them to install.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <label className="block">
                <span className="block text-sm text-white/60 mb-1.5">Your name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Thabo Mokoena"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="block text-sm text-white/60 mb-1.5">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="block text-sm text-white/60 mb-1.5">Password</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                <span className="block text-xs text-white/35 mt-1.5">At least 8 characters.</span>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-accent text-ink-950 font-semibold rounded-lg px-5 py-3 disabled:opacity-60"
              >
                {busy ? "Creating account…" : "Create account"}
              </button>
            </form>

            <p className="text-sm text-white/50 mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-accent underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
