"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Input, PasswordInput } from "@/components/ui/Input";
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

  return (
    <AuthLayout title="Sign in" subtitle="Manage your events and download your memories.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorAlert title="We couldn't sign you in">{error}</ErrorAlert>}

        <Input
          label="Email"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />

        <PasswordInput
          label="Password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />

        <Button type="submit" loading={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-slate-400 transition-colors hover:text-white">
          Forgot password?
        </Link>
        <Link href="/signup" className="font-medium text-indigo-300 transition-colors hover:text-indigo-200">
          Create an account
        </Link>
      </div>
    </AuthLayout>
  );
}
