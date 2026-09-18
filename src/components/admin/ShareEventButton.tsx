"use client";

import { useState } from "react";

interface Props {
  url: string;
  title?: string;
}

export function ShareEventButton({ url, title = "Event Photo Hub" }: Props) {
  const [open, setOpen] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function shareNative() {
    if (navigator.share) {
      await navigator.share({ title, text: `Join ${title}`, url });
      return;
    }
    await navigator.clipboard?.writeText(url);
    setOpen(true);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Share event
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 grid min-w-48 gap-1 rounded-xl border border-white/10 bg-ink-800 p-2 shadow-xl" role="menu">
          <button type="button" onClick={shareNative} className="rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">
            Share or copy link
          </button>
          <a target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} className="rounded-lg px-3 py-2 text-sm hover:bg-white/10" role="menuitem">Facebook</a>
          <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`} className="rounded-lg px-3 py-2 text-sm hover:bg-white/10" role="menuitem">WhatsApp</a>
          <a href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`} className="rounded-lg px-3 py-2 text-sm hover:bg-white/10" role="menuitem">Email</a>
          <a target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} className="rounded-lg px-3 py-2 text-sm hover:bg-white/10" role="menuitem">LinkedIn</a>
          <a target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`} className="rounded-lg px-3 py-2 text-sm hover:bg-white/10" role="menuitem">X / Twitter</a>
          <a target="_blank" rel="noopener noreferrer" href="https://www.instagram.com/" className="rounded-lg px-3 py-2 text-sm hover:bg-white/10" role="menuitem">Instagram</a>
        </div>
      )}
    </div>
  );
}
