"use client";

import clsx from "clsx";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

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
