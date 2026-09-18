"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const plans = new Set(["basic", "standard", "premium"]);

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center px-6"><p className="text-white/60">Loading signup…</p></main>}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlan = searchParams.get("plan")?.toLowerCase() ?? "";
  const plan = plans.has(requestedPlan) ? requestedPlan : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/events/new${plan ? `?plan=${plan}` : ""}`,
      },
    });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.session) {
      router.push(`/admin/events/new${plan ? `?plan=${plan}` : ""}`);
      router.refresh();
      return;
    }

    setMessage("Check your email to confirm your account, then continue creating your event.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-950 px-6 py-12 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-accent mb-3">Memora</p>
        <h1 className="font-display text-3xl mb-2 text-center">Create your host account</h1>
        <p className="text-white/50 text-sm text-center mb-8">
          {plan ? `Selected plan: ${plan}. You will not be charged on signup.` : "Start by creating your free host account."}
        </p>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
        {message && <div className="bg-accent/10 border border-accent/30 text-accent text-sm rounded-xl px-4 py-3 mb-4">{message}</div>}

        <label className="block text-sm text-white/70 mb-1.5" htmlFor="signup-email">Email</label>
        <input id="signup-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 mb-4 outline-none focus:border-accent" />

        <label className="block text-sm text-white/70 mb-1.5" htmlFor="signup-password">Password</label>
        <input id="signup-password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 mb-6 outline-none focus:border-accent" />

        <button type="submit" disabled={loading} className="tap-target w-full bg-accent text-ink-950 font-semibold rounded-xl px-6 py-3 disabled:opacity-60">
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="mt-5 text-center text-sm text-white/60">
          Already have an account? <Link href={`/admin/login${plan ? `?plan=${plan}` : ""}`} className="underline decoration-white/20 underline-offset-4 hover:text-white">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
