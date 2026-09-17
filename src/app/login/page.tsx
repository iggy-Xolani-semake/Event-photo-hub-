"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Client sign-in. Separate from /admin/login on purpose: this is the door
 * clients use, and it sends them to their own dashboard rather than the
 * internal console. Site-host admins can use either — RLS decides what they
 * see, not the URL they came through.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }

    // Read from the URL rather than useSearchParams() so this page stays
    // statically renderable without a Suspense boundary.
    const redirectTo = new URLSearchParams(window.location.search).get("redirectTo");
    router.push(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard");
    router.refresh();
  }

  const inputClass =
    "w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 outline-none focus:border-accent";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl block mb-8">
          Event Photo Hub
        </Link>

        <h1 className="font-display text-3xl mb-2">Sign in</h1>
        <p className="text-white/50 text-sm mb-8">Manage your events and download your photos.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-accent text-ink-950 font-semibold rounded-lg px-5 py-3 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-6 text-sm">
          <Link href="/forgot-password" className="text-white/50 hover:text-white/80">
            Forgot password?
          </Link>
          <Link href="/signup" className="text-accent underline">
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
