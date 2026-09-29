"use client";

import clsx from "clsx";
import { CalendarDays, ImageIcon, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatEventDate } from "@/lib/format";

/**
 * Host search: find one of your events by name, date or code, or a photo by
 * its original filename, without leaving the page you are on.
 *
 * Only rendered for a signed-in host — the API it calls is session-scoped, and
 * a visitor with no events has nothing to search. Results come from
 * /api/search, which reads through the same RLS policies the dashboard does,
 * so search can never show an event the dashboard would hide.
 *
 * Deliberately not a full command palette: no quick actions, no ranking beyond
 * the server's ordering, no fuzzy matching. It answers "where is that event?"
 * and gets out of the way.
 *
 * Accessibility: a labelled input, results as real links in lists, and an
 * `aria-live` summary so a screen reader hears "3 events, 2 photos" (or "No
 * matches") without having to walk the list. Requests are debounced and
 * aborted, so a fast typist never sees results from a stale query.
 */

interface SearchEvent {
  code: string;
  name: string;
  date: string | null;
  status: string;
  photoCount: number;
}

interface SearchPhoto {
  id: string;
  filename: string;
  status: string;
  eventCode: string;
  eventName: string;
}

interface SearchResults {
  query: string;
  events: SearchEvent[];
  photos: SearchPhoto[];
}

const EMPTY: SearchResults = { query: "", events: [], photos: [] };
const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export function GlobalSearch({ fullWidth = false }: { fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmed = query.trim();
  const hasQuery = trimmed.length >= MIN_QUERY_LENGTH;

  // Close on Escape or a click outside the panel.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  // ⌘K / Ctrl+K opens search — the shortcut hosts reach for by reflex. It only
  // focuses the field; there is no palette behind it.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        // Let the input mount before focusing it.
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Debounced fetch with cancellation: the abort matters as much as the delay,
  // otherwise slow responses can land out of order and show the wrong results.
  useEffect(() => {
    if (!open || !hasQuery) {
      setResults(EMPTY);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setError("Search is unavailable right now. Please try again.");
          setResults(EMPTY);
        } else {
          setResults((await response.json()) as SearchResults);
          setError(null);
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError("Search is unavailable right now. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, trimmed, hasQuery]);

  const total = results.events.length + results.photos.length;

  return (
    <div ref={rootRef} className={clsx("relative", fullWidth && "w-full")}>
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          window.requestAnimationFrame(() => inputRef.current?.focus());
        }}
        aria-expanded={open}
        aria-label="Search your events and photos"
        title="Search (⌘K)"
        className={clsx(
          "inline-flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
          fullWidth && "w-full justify-start"
        )}
      >
        <Search className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
        Search
      </button>

      {open && (
        <div
          className={clsx(
            "absolute right-0 top-full z-50 mt-2 w-[22rem] animate-fade-in overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-xl backdrop-blur-md",
            fullWidth && "static mt-2 w-full"
          )}
        >
          <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2.2} aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              autoComplete="off"
              placeholder="Event name, code, date or file name…"
              aria-label="Search your events and photos"
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            {loading && (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-500" aria-hidden="true" />
            )}
            {query && !loading && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {/* Screen readers get the summary, not a narration of the list. */}
            <p aria-live="polite" className="sr-only">
              {!hasQuery
                ? "Type at least two characters to search."
                : loading
                  ? "Searching…"
                  : total === 0
                    ? "No matches."
                    : `${results.events.length} event${results.events.length === 1 ? "" : "s"} and ${results.photos.length} photo${results.photos.length === 1 ? "" : "s"} found.`}
            </p>

            {!hasQuery ? (
              <p className="px-2.5 py-3 text-xs text-slate-500">
                Search your own events by name, code or date — or find a photo by its original file
                name (for example <span className="font-mono text-slate-400">IMG_2041</span>).
              </p>
            ) : error ? (
              <p className="px-2.5 py-3 text-xs font-medium text-rose-300">{error}</p>
            ) : !loading && total === 0 ? (
              <p className="px-2.5 py-3 text-xs text-slate-500">
                No matches for <span className="font-semibold text-slate-300">{trimmed}</span>.
              </p>
            ) : (
              <>
                {results.events.length > 0 && (
                  <div className="mb-1">
                    <p className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Events
                    </p>
                    <ul>
                      {results.events.map((event) => (
                        <li key={event.code}>
                          <Link
                            href={`/dashboard/events/${event.code}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300"
                              aria-hidden="true"
                            >
                              <CalendarDays className="h-4 w-4" strokeWidth={2.2} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-white">
                                {event.name}
                              </span>
                              <span className="block truncate text-[11px] text-slate-500">
                                <span className="font-mono">{event.code}</span>
                                {event.date ? ` · ${formatEventDate(event.date)}` : ""} ·{" "}
                                {event.photoCount} photo{event.photoCount === 1 ? "" : "s"}
                                {event.status !== "active" ? ` · ${event.status}` : ""}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.photos.length > 0 && (
                  <div>
                    <p className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Photos
                    </p>
                    <ul>
                      {results.photos.map((photo) => (
                        <li key={photo.id}>
                          <Link
                            href={`/gallery/${photo.eventCode}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300"
                              aria-hidden="true"
                            >
                              <ImageIcon className="h-4 w-4" strokeWidth={2.2} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-white">
                                {photo.filename}
                              </span>
                              <span className="block truncate text-[11px] text-slate-500">
                                {photo.eventName}
                                {photo.status !== "ready" ? ` · ${photo.status}` : ""}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
