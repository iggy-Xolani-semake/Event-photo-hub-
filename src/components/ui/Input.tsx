"use client";

import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

/**
 * Form controls. The dark slate field style, focus ring and label/micro-copy
 * ramp live here so every form in the app (auth, event setup, admin console)
 * behaves identically.
 */

const FIELD_CLASS =
  "w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white " +
  "placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={clsx(FIELD_CLASS, error && "border-rose-500/70 focus:border-rose-500 focus:ring-rose-500", className)}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs font-medium text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  /** Rendered as a hint under the field; the toggle does not replace it. */
  hint?: ReactNode;
}

/**
 * Password field with a show/hide toggle.
 *
 * Same label/hint/error contract as Input, so it drops into the auth forms
 * without changing their markup or their autocomplete behaviour. The toggle is
 * a real labelled button (`aria-pressed`, name flips between "Show password"
 * and "Hide password") rather than a decorative icon, and it is `tabIndex={-1}`
 * -free so keyboard users can reach it between the field and the submit button.
 *
 * Revealing is deliberately a client-only affordance: the input's `type`
 * flips, the value never leaves the component.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, hint, error, className, id, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx(
            FIELD_CLASS,
            "pr-12",
            error && "border-rose-500/70 focus:border-rose-500 focus:ring-rose-500",
            className
          )}
          {...rest}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          title={visible ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>
      </div>

      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs font-medium text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, children, ...rest },
  ref
) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500"
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        className={clsx(FIELD_CLASS, "appearance-none", error && "border-rose-500/70", className)}
        {...rest}
      >
        {children}
      </select>
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-rose-400">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
});
