"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Input } from "@/components/ui/Input";
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
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter the email address on your account and we'll send a secure recovery link."
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
        {error && <ErrorAlert title="Recovery email failed">{error}</ErrorAlert>}

        <Input
          label="Email"
          id="recovery-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />

        <Button type="submit" loading={loading} className="w-full">
          {loading ? "Sending link…" : "Send recovery link"}
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
