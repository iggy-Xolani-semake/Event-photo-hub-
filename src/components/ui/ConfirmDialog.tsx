"use client";

import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

/**
 * The confirmation dialog for destructive actions.
 *
 * Replaces `window.confirm()`, which cannot be styled, cannot say which photo
 * is about to go, and blocks the whole tab. Behaviour that matters for an
 * action with no undo:
 *
 *  - focus moves into the dialog and is trapped there until it closes;
 *  - Escape and a backdrop click both mean "cancel", never "confirm";
 *  - the *cancel* button takes focus first, so a stray Enter or Space cannot
 *    delete anything;
 *  - `aria-modal` + labelled/described-by wiring so screen readers announce
 *    what is being confirmed, not just "button";
 *  - focus returns to the element that opened it;
 *  - the rest of the page cannot scroll behind it.
 *
 * The trigger stays in charge of `open` and of doing the work; this component
 * only collects the decision.
 */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What exactly is about to happen, and that it cannot be undone. */
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" paints the confirm action rose; use for irreversible actions. */
  tone?: "danger" | "default";
  /** Shows a spinner on the confirm button and blocks a double submit. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const close = useCallback(() => {
    if (busy) return;
    onCancel();
  }, [busy, onCancel]);

  // Escape cancels; Tab cycles inside the dialog. Bound on the document so the
  // shortcut works no matter where focus went.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") return;

      const container = dialogRef.current;
      if (!container) return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Pull focus in on open (cancel first), hand it back on close.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center print:hidden">
      {/* Backdrop: click to cancel, but only the backdrop itself. */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md animate-slide-up rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-card-lg"
      >
        <div className="flex items-start gap-4">
          <span
            className={clsx(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              tone === "danger"
                ? "bg-rose-500/15 text-rose-300"
                : "bg-indigo-500/15 text-indigo-300"
            )}
            aria-hidden="true"
          >
            <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
          </span>

          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-white">
              {title}
            </h2>
            <div id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-slate-400">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={close} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={busy}
          >
            {busy ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmDialog;
