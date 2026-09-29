"use client";

import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { useEffect, useState } from "react";
import { setBottomNoticeVisible } from "./noticeStore";

/**
 * Simple cookie notice.
 *
 * The copy is deliberately narrow because it is accurate: Memora sets exactly
 * two kinds of cookie, both strictly necessary — the Supabase auth session for
 * a signed-in host, and an anonymous, event-scoped guest session token so an
 * upload can be attributed without an account. There are no analytics or
 * advertising cookies on the site, so this is a *notice* with an acknowledge
 * button, not a consent gate with categories, and it never blocks the page.
 *
 * Dismissal is remembered in localStorage. It is intentionally not a cookie:
 * writing a cookie to tell someone about cookies is the kind of thing that
 * loses trust.
 *
 * Reading localStorage must happen in an effect, after hydration — doing it
 * during render would produce different markup on the server and the client.
 */

const STORAGE_KEY = "memora:cookie-notice:v1";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "acknowledged") {
        setVisible(true);
      }
    } catch {
      // Private mode / storage disabled: show it, and let it be dismissed for
      // this page view only rather than throwing.
      setVisible(true);
    }
  }, []);

  // Tell the floating utilities to step aside on small screens while this is
  // up; they come back the moment it is dismissed.
  useEffect(() => {
    setBottomNoticeVisible(visible);
    return () => setBottomNoticeVisible(false);
  }, [visible]);

  function acknowledge() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {
      // Nothing we can do; hiding it for this view is still the right UX.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-3 z-30 animate-slide-up rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-card-lg backdrop-blur-md print:hidden sm:left-4 sm:right-auto sm:max-w-sm"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"
          aria-hidden="true"
        >
          <Cookie className="h-4 w-4" strokeWidth={2.2} />
        </span>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Cookies, briefly</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            We only use essential cookies: your sign-in session, and an anonymous guest session so
            a photo can be credited to your upload without an account. No tracking, no ads.{" "}
            <Link
              href="/privacy"
              className="font-medium text-indigo-300 underline decoration-indigo-500/40 underline-offset-2 transition-colors hover:text-indigo-200"
            >
              Privacy policy
            </Link>
          </p>

          <button
            type="button"
            onClick={acknowledge}
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Got it
          </button>
        </div>

        <button
          type="button"
          onClick={acknowledge}
          aria-label="Dismiss cookie notice"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default CookieNotice;
