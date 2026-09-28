import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Empty State (1 of the 4 required UX states): centred minimalist icon, one
 * friendly sentence, and the action that gets the user out of the emptiness.
 * Used by event lists, galleries, billing history — anywhere a query can
 * legitimately return nothing.
 */
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-16 text-center",
        className
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/50 text-slate-400">
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-semibold text-slate-100">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
