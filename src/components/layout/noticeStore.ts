"use client";

import { useSyncExternalStore } from "react";

/**
 * One bit of shared state: is a bottom-anchored notice (the cookie banner)
 * currently on screen?
 *
 * The banner and the floating utilities (contact, back-to-top) both want the
 * bottom of a phone screen. Rather than let them overlap — a floating button
 * sitting on top of the notice's own links is a mis-tap waiting to happen —
 * the utilities ask this store and step aside on small screens while the
 * notice is up. On desktop there is no conflict (the notice is bottom-left,
 * the utilities bottom-right), so nothing changes there.
 *
 * A module-level store rather than context because the two components are
 * mounted by different pages and are not otherwise related; this is the same
 * pattern as the hero's demo store.
 */

let visible = false;
const listeners = new Set<() => void>();

export function setBottomNoticeVisible(next: boolean) {
  if (visible === next) return;
  visible = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** False on the server and on first render, so markup never mismatches. */
export function useBottomNoticeVisible(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => visible,
    () => false
  );
}
