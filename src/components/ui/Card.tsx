import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * Standard panel: rounded-2xl, slate-800 hairline, slate-900/50 fill and a deep
 * shadow. `glass` upgrades to the semi-transparent blurred surface the design
 * system asks for on panels that float over the canvas (headers, modals,
 * sticky bars).
 */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  /** Tighter padding for dense lists and toolbars. */
  dense?: boolean;
}

export function Card({ glass = false, dense = false, className, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-800 shadow-xl",
        glass ? "bg-slate-900/60 backdrop-blur-md" : "bg-slate-900/50",
        dense ? "p-4" : "p-6",
        className
      )}
      {...rest}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Section header inside a card: system type ramp, action right-aligned. */
export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={clsx("mb-5 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-slate-400 md:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
