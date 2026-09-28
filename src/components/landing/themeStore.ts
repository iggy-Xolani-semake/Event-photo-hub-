"use client";

import { useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "memora-theme";

/**
 * A hand-rolled external store instead of React context on purpose: the theme
 * is read by two components that live in different subtrees (the header toggle
 * and, potentially, any future floating control), and a store lets both stay
 * independent client components so the rest of the marketing page can remain
 * server-rendered.
 *
 * The pre-paint inline script in src/app/layout.tsx is what actually sets the
 * initial `dark` class — this store only owns *changes* after hydration.
 */
let current: Theme = "light";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function apply(theme: Theme) {
  current = theme;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing / full storage: the toggle still works for this session.
  }
  apply(theme);
  emit();
}

export function toggleTheme() {
  setTheme(current === "dark" ? "light" : "dark");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Server snapshot is always "light"; the effect below reconciles on mount. */
function getServerSnapshot(): Theme {
  return "light";
}

export function useTheme(): Theme {
  const theme = useSyncExternalStore(subscribe, () => current, getServerSnapshot);

  useEffect(() => {
    // Adopt whatever the inline script decided (stored choice or OS preference)
    // so the store and the DOM can never disagree after hydration.
    const resolved: Theme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    if (resolved !== current) {
      current = resolved;
      emit();
    }
  }, []);

  return theme;
}
