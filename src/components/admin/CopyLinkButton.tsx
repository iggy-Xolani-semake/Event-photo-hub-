"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyTextToClipboard } from "@/lib/clipboard";

/**
 * Copies an event link. This is how hosts actually distribute a gallery, so
 * the button reports what really happened: `copyTextToClipboard` has a fallback
 * for non-secure contexts and browsers that refuse the async clipboard API, and
 * a failure says so instead of claiming "Copied ✓" over an empty clipboard.
 *
 * The reset timer is cleared on unmount so a host navigating away mid-message
 * does not leave a stray timer behind.
 */
export function CopyLinkButton({ url, label }: { url: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleCopy() {
    const copied = await copyTextToClipboard(url);
    setState(copied ? "copied" : "failed");

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), copied ? 1800 : 4000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 text-center text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      {state === "copied" ? (
        <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.6} aria-hidden="true" />
      ) : state === "failed" ? (
        <TriangleAlert className="h-4 w-4 text-amber-400" strokeWidth={2.4} aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
      )}

      <span aria-live="polite">
        {state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy — select the link" : label}
      </span>
    </button>
  );
}

export default CopyLinkButton;
