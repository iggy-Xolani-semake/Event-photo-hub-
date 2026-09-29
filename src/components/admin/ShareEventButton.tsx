"use client";

import { useState } from "react";
import { copyTextToClipboard } from "@/lib/clipboard";

interface Props {
  url: string;
  title?: string;
}

export function ShareEventButton({ url, title = "Memora" }: Props) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  /**
   * Prefer the OS share sheet when the browser has one (that is what mobile
   * hosts expect), then fall back to copying the link. Both paths report
   * outward: a cancelled share sheet is not an error, but a copy that failed
   * must not be silent.
   */
  async function shareNative() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `Join ${title}`, url });
        return;
      } catch (err) {
        // AbortError = the user dismissed the sheet; anything else falls through.
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    const copied = await copyTextToClipboard(url);
    setNotice(copied ? "Link copied to your clipboard." : "Couldn't copy — select the link below.");
    setOpen(true);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Share event
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 grid min-w-48 gap-1 rounded-xl border border-slate-800 bg-slate-800/60 p-2 shadow-xl" role="menu">
          {notice && (
            <p role="status" className="px-3 pb-1 pt-1 text-xs font-medium text-slate-300">
              {notice}
            </p>
          )}
          <button type="button" onClick={shareNative} className="rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Share or copy link
          </button>
          <a target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} className="rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" role="menuitem">Facebook</a>
          <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`} className="rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" role="menuitem">WhatsApp</a>
          <a href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`} className="rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" role="menuitem">Email</a>
          <a target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} className="rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" role="menuitem">LinkedIn</a>
          <a target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`} className="rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" role="menuitem">X / Twitter</a>
          <a target="_blank" rel="noopener noreferrer" href="https://www.instagram.com/" className="rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" role="menuitem">Instagram</a>
        </div>
      )}
    </div>
  );
}
