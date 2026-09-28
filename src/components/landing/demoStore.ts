"use client";

import { useSyncExternalStore } from "react";

/**
 * Fires the hero's guest demo from anywhere on the page without threading a
 * callback (or a context provider) down through the server-rendered hero copy.
 *
 * The store holds a monotonically increasing counter rather than a boolean:
 * subscribers react to *each* request, so pressing "Try Guest Demo" twice in a
 * row restarts the demo both times instead of being swallowed by an unchanged
 * value.
 */
let requests = 0;
const listeners = new Set<() => void>();

export function requestGuestDemo() {
  requests += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 0 on the server and on first client render — the demo only starts on a real request. */
export function useGuestDemoRequest(): number {
  return useSyncExternalStore(
    subscribe,
    () => requests,
    () => 0
  );
}
