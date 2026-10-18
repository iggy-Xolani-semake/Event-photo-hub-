"use client";

import { useState } from "react";
import { copyTextToClipboard } from "@/lib/clipboard";
import { SavePhotosButton } from "./SavePhotosButton";
import { GUEST_CANNOT_DOWNLOAD_NOTE } from "@/lib/guest/photoRights";

interface Props {
  eventName: string;
  successCount: number;
  failedCount: number;
  galleryHref: string;
  galleryAvailable: boolean;
  galleryCount: number | null;
  /**
   * The guest's own originals for everything that uploaded — the last chance
   * to hand them back before `useGuestUploader.reset()` drops them. iOS Safari
   * does not put a `capture="environment"` shot in Photos, so without this the
   * guest leaves with no copy at all.
   */
  savedFiles: File[];
  onAddMore: () => void;
  onRetryFailed: () => void;
}

/**
 * FROG #4 — the upload result has to feel like a reward and then hand the
 * guest straight into everybody else's photos. "Uploaded ✓ / Take another"
 * is a dead end; "They're live — go and see them" is the loop.
 */
export function UploadSuccessScreen({
  eventName,
  successCount,
  failedCount,
  galleryHref,
  galleryAvailable,
  galleryCount,
  savedFiles,
  onAddMore,
  onRetryFailed,
}: Props) {
  const allFailed = successCount === 0;
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  async function shareGallery() {
    const url = `${window.location.origin}${galleryHref}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: eventName, text: `See the photos from ${eventName}`, url });
        return;
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
      }
    }
    const copied = await copyTextToClipboard(url);
    setShareNotice(copied ? "Gallery link copied." : "Couldn’t copy the gallery link.");
  }

  if (allFailed) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
        <div className="mb-6 text-6xl">⚠️</div>
        <h1 className="mb-2 text-2xl font-semibold">Upload interrupted</h1>
        <p className="mb-10 max-w-sm text-slate-400">
          None of your memories made it through. Check your connection and try again —
          nothing was lost.
        </p>
        <button
          type="button"
          onClick={onRetryFailed}
          className="tap-target rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-10 py-4 text-lg font-semibold text-white transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-6 animate-slide-up text-6xl">🎉</div>
      <h1 className="mb-3 font-display text-3xl leading-tight">They&apos;re live!</h1>
      <p className="max-w-sm text-slate-400">
        Your {successCount} photo{successCount === 1 ? "" : "s"} {successCount === 1 ? "is" : "are"}{" "}
        now part of {eventName}
        {galleryAvailable && galleryCount !== null ? ` — ${galleryCount} in total.` : "."}
      </p>

      {failedCount > 0 && (
        <p className="mt-4 max-w-sm text-sm text-amber-300/80">
          {failedCount} photo{failedCount === 1 ? "" : "s"} couldn&apos;t be uploaded.
        </p>
      )}

      <p className="mt-6 max-w-sm text-xs leading-relaxed text-slate-500">
        {GUEST_CANNOT_DOWNLOAD_NOTE}
      </p>

      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        {galleryAvailable && (
          <a
            href={galleryHref}
            className="tap-target flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/20 transition-transform active:scale-[0.98]"
          >
            {galleryCount !== null ? `See all ${galleryCount} photos` : "See the gallery"}
          </a>
        )}

        {galleryAvailable && (
          <button
            type="button"
            onClick={shareGallery}
            className="tap-target w-full rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-4 text-base font-semibold text-indigo-800 transition-colors hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Share the gallery with friends
          </button>
        )}
        {shareNotice && <p className="text-sm font-medium text-indigo-700" role="status">{shareNotice}</p>}

        {failedCount > 0 && (
          <button
            type="button"
            onClick={onRetryFailed}
            className="tap-target w-full rounded-2xl border border-amber-400/40 bg-amber-400/10 px-6 py-4 text-base font-semibold text-amber-100 transition-colors hover:border-amber-400/60 hover:bg-amber-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Retry the {failedCount} that failed
          </button>
        )}

        {/* Their photos, back in their hands. The server never lets a guest
            download an original, so this button is the guest's only way to
            keep what they just contributed. */}
        <SavePhotosButton files={savedFiles} eventName={eventName} />

        <button
          type="button"
          onClick={onAddMore}
          className={`tap-target w-full rounded-2xl px-6 py-4 text-lg font-semibold transition-transform active:scale-[0.98] ${
            galleryAvailable
              ? "border border-slate-700 bg-slate-800/60 text-white hover:border-slate-600 hover:bg-slate-800"
              : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:from-violet-500 hover:to-indigo-500"
          }`}
        >
          Add more photos
        </button>
      </div>
    </div>
  );
}
