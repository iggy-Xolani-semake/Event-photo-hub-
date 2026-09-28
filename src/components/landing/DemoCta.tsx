"use client";

import clsx from "clsx";
import { Play } from "lucide-react";
import { requestGuestDemo } from "./demoStore";

/**
 * Secondary hero CTA. Fires the hero showcase's guest demo (and scrolls to it)
 * through the demo store rather than a prop, so the hero copy above it can stay
 * a server component.
 */
export function DemoCta({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={requestGuestDemo}
      className={clsx(
        "group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-violet-400 hover:text-violet-700 hover:shadow-card active:translate-y-0",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:border-violet-400/60 dark:hover:bg-white/[0.08] dark:hover:text-violet-200 dark:focus-visible:ring-offset-ink-950",
        className
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/[0.06] transition group-hover:bg-violet-500/15 dark:bg-white/10 dark:group-hover:bg-violet-400/20">
        <Play className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
      </span>
      Try Guest Demo
    </button>
  );
}

export default DemoCta;
