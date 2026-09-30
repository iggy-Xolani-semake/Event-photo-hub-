"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isApprovedAdminEmail } from "@/lib/auth/adminAllowlist";
import { PasswordInput } from "@/components/ui/Input";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError("Incorrect email or password.");
      return;
    }

    const explicitRedirect = searchParams.get("redirectTo");
    if (explicitRedirect) {
      router.push(explicitRedirect);
      router.refresh();
      return;
    }

    // No explicit destination requested (e.g. a bookmarked admin link) —
    // send the user to the view that fits their role. app_metadata.role
    // is the same claim is_admin() checks in RLS (0002_rls.sql), so this
    // is purely a UX routing choice; it grants no access on its own.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const role = (user?.app_metadata as Record<string, unknown> | undefined)?.role;
    const isApprovedAdmin = role === "admin" && isApprovedAdminEmail(user?.email);

    router.push(isApprovedAdmin || role === "curator" ? "/admin" : "/client");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas px-6 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1 text-center">shutaMzala</h1>
        <p className="text-slate-500 text-sm text-center mb-8">Sign in</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <label className="block text-sm text-slate-400 mb-1.5">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-3 mb-4 outline-none focus:border-indigo-500"
        />

        <div className="mb-6">
          <PasswordInput
            label="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="tap-target w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl px-6 py-3 disabled:opacity-60 transition-all hover:from-violet-500 hover:to-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <div className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm text-slate-400 underline decoration-white/20 underline-offset-4 hover:text-white">
            Forgot password?
          </Link>
        </div>

        <p className="mt-5 text-center text-sm text-slate-400">
          New host? <Link href={`/signup${searchParams.get("plan") ? `?plan=${searchParams.get("plan")}` : ""}`} className="underline decoration-white/20 underline-offset-4 hover:text-white">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
