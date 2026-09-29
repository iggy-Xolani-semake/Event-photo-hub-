"use client";

import { Heart, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { GalleryPhoto } from "./GalleryView";

interface Props {
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
  onToggleFavourite: (photoId: string) => void;
  canManage: boolean;
  onDelete: (photoId: string) => Promise<boolean>;
}

/**
 * Full-screen viewer. Swipes/arrow keys move between photos, Escape closes.
 *
 * Deleting goes through the shared ConfirmDialog rather than `window.confirm`:
 * the native dialog cannot name the photo being removed, cannot be styled, and
 * blocks the whole tab. A failure is reported inline instead of through
 * `alert()`, which has the same problems.
 *
 * The keyboard shortcuts are suspended while the confirmation is open —
 * otherwise Escape would dismiss the dialog *and* the viewer behind it, and the
 * arrow keys would shuffle photos underneath a "delete this one?" question.
 */
export function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
  onToggleFavourite,
  canManage,
  onDelete,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const photo = photos[index];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (confirmOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, photos.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, photos.length, confirmOpen]);

  if (!photo) return null;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    const SWIPE_THRESHOLD = 50;
    if (deltaX > SWIPE_THRESHOLD) setIndex((i) => Math.max(i - 1, 0));
    else if (deltaX < -SWIPE_THRESHOLD) setIndex((i) => Math.min(i + 1, photos.length - 1));
    touchStartX.current = null;
  }

  async function handleDownloadOriginal() {
    if (!photo) return;
    const res = await fetch(`/api/photos/${photo.id}/download`);
    if (!res.ok) return;
    const { url } = await res.json();
    const a = document.createElement("a");
    a.href = url;
    a.download = photo.original_filename ?? "photo.jpg";
    a.click();
  }

  async function handleConfirmedDelete() {
    if (!photo) return;
    setDeleting(true);
    const success = await onDelete(photo.id);
    setDeleting(false);
    setConfirmOpen(false);

    if (!success) {
      setError("Could not delete this photo. Please try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${photos.length}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button
          onClick={onClose}
          aria-label="Close photo viewer"
          title="Close (Esc)"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
        </button>

        <span className="text-sm text-slate-500" aria-hidden="true">
          {index + 1} / {photos.length}
        </span>

        <button
          onClick={() => onToggleFavourite(photo.id)}
          aria-label={photo.is_favourite ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={photo.is_favourite}
          title={photo.is_favourite ? "Remove from favourites" : "Add to favourites"}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Heart
            className={photo.is_favourite ? "h-5 w-5 fill-rose-500 text-rose-500" : "h-5 w-5"}
            strokeWidth={2.2}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {photo.galleryUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- full-screen viewer, arbitrary aspect ratios, swipeable
          <img src={photo.galleryUrl} alt="" className="max-h-full max-w-full object-contain" />
        )}
      </div>

      {error && (
        <p role="alert" className="px-4 pb-2 text-center text-sm font-medium text-rose-300">
          {error}
        </p>
      )}

      <div className="flex justify-center gap-3 px-4 py-4">
        <button
          onClick={handleDownloadOriginal}
          className="tap-target rounded-full border border-slate-700 bg-slate-800/60 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Download Original
        </button>

        {canManage && (
          <button
            onClick={() => {
              setError(null);
              setConfirmOpen(true);
            }}
            disabled={deleting}
            className="tap-target inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/15 px-6 py-3 text-sm font-medium text-red-200 transition-colors hover:border-red-500/50 hover:bg-red-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            )}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        tone="danger"
        busy={deleting}
        title="Delete this photo?"
        description={
          <>
            <span className="font-medium text-slate-300">
              {photo.original_filename ?? "This photo"}
            </span>{" "}
            will be removed from the gallery and its files deleted. This cannot be undone.
          </>
        }
        confirmLabel="Delete photo"
        onConfirm={() => void handleConfirmedDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export default PhotoLightbox;
