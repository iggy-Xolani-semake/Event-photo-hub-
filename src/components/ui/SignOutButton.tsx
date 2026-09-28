"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "./Button";

/**
 * Client-side sign out. Ends the Supabase session, then hard-navigates to
 * /login: router.refresh() alone would leave signed-in server components
 * rendering for one extra paint.
 */
export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={busy}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-white disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" strokeWidth={2.2} />
        Sign out
      </button>
    );
  }

  return (
    <Button variant="secondary" onClick={handleSignOut} loading={busy}>
      <LogOut className="h-4 w-4" strokeWidth={2.2} />
      Sign out
    </Button>
  );
}
