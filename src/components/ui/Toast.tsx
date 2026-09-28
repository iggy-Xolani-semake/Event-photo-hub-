"use client";

import clsx from "clsx";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Success State (3 of 4): soft toasts. One provider per layout; any client
 * component below it calls useToast().show(...) after a mutation succeeds.
 *
 * Toasts sit top-centre on small screens (clear of the guest bottom action
 * bar) and top-right from md up. They dismiss themselves, and can always be
 * dismissed by hand.
 */

export type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  show: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}

const TONE_STYLES: Record<ToastTone, { ring: string; icon: ReactNode }> = {
  success: {
    ring: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={2.2} />,
  },
  error: {
    ring: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    icon: <XCircle className="h-4 w-4 text-rose-400" strokeWidth={2.2} />,
  },
  info: {
    ring: "border-indigo-500/40 bg-indigo-500/10 text-indigo-200",
    icon: <Info className="h-4 w-4 text-indigo-400" strokeWidth={2.2} />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-[80] flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:top-6 md:items-end"
      >
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className={clsx(
              "pointer-events-auto flex w-full max-w-sm animate-slide-in-right items-start gap-3 rounded-xl border px-4 py-3 text-left shadow-xl backdrop-blur-md",
              TONE_STYLES[toast.tone].ring
            )}
          >
            <span className="mt-0.5 shrink-0">{TONE_STYLES[toast.tone].icon}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{toast.title}</span>
              {toast.description && (
                <span className="mt-0.5 block text-xs leading-relaxed opacity-80">{toast.description}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
