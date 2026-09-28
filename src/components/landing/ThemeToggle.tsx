"use client";

import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { toggleTheme, useTheme } from "./themeStore";

/**
 * Light/dark switch for the marketing pages.
 *
 * Both icons are always in the DOM and swapped with CSS (`dark:hidden`), so the
 * correct one is showing on the very first paint — before the store has
 * reconciled with the pre-paint theme script. Only the accessible label is
 * driven by JS, and it corrects on mount.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
      className={clsx(
        "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition",
        "hover:border-slate-300 hover:text-slate-900 active:scale-95",
        "dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:border-white/20 dark:hover:text-white",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-ink-950",
        className
      )}
    >
      <Sun className="h-4 w-4 dark:hidden" strokeWidth={2.2} />
      <Moon className="hidden h-4 w-4 dark:block" strokeWidth={2.2} />
    </button>
  );
}

export default ThemeToggle;
