import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Status language for the whole app, fixed to the four accent states:
 * emerald = ready/success, amber = processing, rose = limit/error/deleted,
 * indigo = informational, slate = neutral.
 */

export type BadgeTone = "success" | "processing" | "danger" | "info" | "neutral";

const TONES: Record<BadgeTone, string> = {
  success: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  processing: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  danger: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
  info: "border border-violet-200/80 bg-violet-100 text-violet-700 ring-violet-500/20",
  neutral: "bg-slate-500/10 text-slate-400 ring-slate-500/30",
};

const DOT: Record<BadgeTone, string> = {
  success: "bg-emerald-400",
  processing: "bg-amber-400",
  danger: "bg-rose-400",
  info: "bg-indigo-400",
  neutral: "bg-slate-400",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  /** Leading status dot; `pulse` adds the processing shimmer. */
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function Badge({ tone = "neutral", children, dot = false, pulse = false, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wider ring-1",
        TONES[tone],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span className={clsx("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", DOT[tone])} />
          )}
          <span className={clsx("relative inline-flex h-1.5 w-1.5 rounded-full", DOT[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}
