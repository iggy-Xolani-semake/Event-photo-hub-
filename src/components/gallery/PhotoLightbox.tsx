"use client";

import { useEffect, useState, useRef } from "react";
import type { GalleryPhoto } from "./GalleryView";

interface Props {
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
  onToggleFavourite: (photoId: string) => void;
}

export function PhotoLightbox({ photos, initialIndex, onClose, onToggleFavourite }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);

  const photo = photos[index];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, photos.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, photos.length]);

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

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onClose} className="text-2xl w-10 h-10 flex items-center justify-center">
          ✕
        </button>
        <span className="text-sm text-white/50">
          {index + 1} / {photos.length}
        </span>
        <button
          onClick={() => onToggleFavourite(photo.id)}
          className="text-2xl w-10 h-10 flex items-center justify-center"
        >
          {photo.is_favourite ? "❤️" : "🤍"}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {photo.galleryUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- full-screen viewer, arbitrary aspect ratios, swipeable
          <img src={photo.galleryUrl} alt="" className="max-w-full max-h-full object-contain" />
        )}
      </div>

      <div className="px-4 py-4 flex justify-center">
        <button
          onClick={handleDownloadOriginal}
          className="tap-target bg-white/10 border border-white/20 text-white rounded-full px-6 py-3 text-sm font-medium"
        >
          Download Original
        </button>
      </div>
    </div>
  );
}
