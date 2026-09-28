"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the OS "reduce motion" setting. The marketing page has a lot of
 * ambient movement (floating device mockups, a looping guest demo, scroll
 * reveals); every one of those opts out when this returns true.
 *
 * Returns false during SSR and on first client render, then reconciles in an
 * effect — so server and client markup always agree and nothing warns about a
 * hydration mismatch.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
