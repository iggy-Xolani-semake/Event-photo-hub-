import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

/**
 * Error State (4 of 4): soft red alert card with a friendly message and an
 * explicit recovery action ("Retry Upload", "Try again"), never a dead end.
 */
interface ErrorAlertProps {
  title?: string;
  children: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorAlert({ title = "Something went wrong", children, onRetry, retryLabel = "Try again", className }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className={
        "flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 sm:flex-row sm:items-center sm:justify-between " +
        (className ?? "")
      }
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
          <AlertTriangle className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-rose-200">{title}</p>
          <div className="mt-1 text-sm leading-relaxed text-rose-200/70">{children}</div>
        </div>
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry} className="shrink-0">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
