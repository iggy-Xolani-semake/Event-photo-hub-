import clsx from "clsx";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";

/**
 * The one button implementation in the app. Every CTA, toolbar action and icon
 * button goes through here so the gradient fill, focus ring and press feedback
 * in the design system can only exist in one place.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas " +
  "disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20 active:scale-[0.98]",
  secondary:
    "bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 active:scale-[0.98]",
  ghost: "text-slate-300 hover:bg-slate-800/60 hover:text-white",
  danger:
    "bg-rose-600/90 hover:bg-rose-600 text-white font-medium shadow-lg shadow-rose-500/20 active:scale-[0.98]",
  success:
    "bg-emerald-600/90 hover:bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-500/20 active:scale-[0.98]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "rounded-lg px-3.5 py-2 text-xs",
  md: "rounded-xl px-5 py-2.5 text-sm",
  lg: "rounded-xl px-6 py-3 text-base",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}

export interface ButtonProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(BASE, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export interface ButtonLinkProps
  extends CommonProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href"> {
  href: string;
}

/** Anchor styled as a button — real links must stay links for keyboard/SEO. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link href={href} className={clsx(BASE, VARIANTS[variant], SIZES[size], className)} {...rest}>
      {children}
    </Link>
  );
}

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  active?: boolean;
  children: ReactNode;
}

/** Square icon-only control: aspect-square per the design system. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active = false, className, children, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex aspect-square items-center justify-center rounded-lg transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "disabled:pointer-events-none disabled:opacity-50",
        active
          ? "bg-slate-700 text-white"
          : "bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
