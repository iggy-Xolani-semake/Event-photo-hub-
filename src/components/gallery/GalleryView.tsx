"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoLightbox } from "./PhotoLightbox";
import { GalleryToolbar } from "./GalleryToolbar";
import type { Photo } from "@/types/database";

export interface GalleryPhoto extends Photo {
  thumbnailUrl: string | null;
  galleryUrl: string | null;
}

interface Props {
  eventCode: string;
  eventName: string;
  photos: GalleryPhoto[];
  totalCount: number;
  processingCount?: number;
  failedCount?: number;
}

type Tab = "all" | "favourites";

export function GalleryView({
  eventCode,
  eventName,
  photos: initialPhotos,
  totalCount,
  processingCount = 0,
  failedCount = 0,
}: Props) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    if (processingCount === 0) return;
    const interval = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [processingCount, router]);
  const [tab, setTab] = useState<Tab>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const visiblePhotos = useMemo(
    () => (tab === "favourites" ? photos.filter((p) => p.is_favourite) : photos),
    [photos, tab]
  );

  const favouriteCount = useMemo(() => photos.filter((p) => p.is_favourite).length, [photos]);

  async function toggleFavourite(photoId: string) {
    const target = photos.find((p) => p.id === photoId);
    if (!target) return;
    const nextValue = !target.is_favourite;

    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, is_favourite: nextValue } : p)));

    const res = await fetch(`/api/photos/${photoId}/favourite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavourite: nextValue }),
    });

    if (!res.ok) {
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, is_favourite: !nextValue } : p)));
    }
  }

  function toggleSelected(photoId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  return (
    <main className="min-h-screen pb-24">
      <GalleryToolbar
        eventName={eventName}
        eventCode={eventCode}
        tab={tab}
        onTabChange={setTab}
        totalCount={totalCount}
        favouriteCount={favouriteCount}
        selectMode={selectMode}
        onToggleSelectMode={() => {
          setSelectMode((v) => !v);
          setSelectedIds(new Set());
        }}
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
      />

      {(processingCount > 0 || failedCount > 0) && (
        <div className="mx-2 mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {processingCount > 0 && (
            <span>{processingCount} photo{processingCount === 1 ? " is" : "s are"} still being processed. This gallery refreshes automatically.</span>
          )}
          {processingCount > 0 && failedCount > 0 && <span> </span>}
          {failedCount > 0 && (
            <span>{failedCount} photo{failedCount === 1 ? " could not" : "s could not"} be processed.</span>
          )}
        </div>
      )}

      {visiblePhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="text-4xl mb-3">📷</div>
          <p className="text-white/50">
            {tab === "favourites" ? "No favourites yet." : "No photos yet — be the first to share one!"}
          </p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 px-2 [column-fill:_balance]">
          {visiblePhotos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => (selectMode ? toggleSelected(photo.id) : setLightboxIndex(index))}
              className="relative mb-2 w-full block break-inside-avoid rounded-lg overflow-hidden bg-white/5"
            >
              {photo.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- variable-aspect masonry tiles, next/image forces a fixed box
                <img
                  src={photo.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  className="w-full h-auto block"
                  style={{ aspectRatio: photo.width && photo.height ? `${photo.width}/${photo.height}` : undefined }}
                />
              ) : (
                <div className="w-full aspect-square bg-white/5" />
              )}

              {photo.is_favourite && (
                <span className="absolute top-1.5 right-1.5 text-sm drop-shadow">❤️</span>
              )}

              {selectMode && (
                <span
                  className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] ${
                    selectedIds.has(photo.id) ? "bg-accent border-accent text-ink-950" : "bg-black/30"
                  }`}
                >
                  {selectedIds.has(photo.id) ? "✓" : ""}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={visiblePhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onToggleFavourite={toggleFavourite}
        />
      )}
    </main>
  );
}
