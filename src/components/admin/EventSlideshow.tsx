"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, Maximize, Minimize, Pause, Play, X } from "lucide-react";

export interface SlideshowPhoto {
  id: string;
  url: string;
  filename: string | null;
  isFavourite: boolean;
  usesOriginal: boolean;
}

interface Props {
  eventCode: string;
  eventName: string;
  photos: SlideshowPhoto[];
}

const SLIDE_DURATION_MS = 6000;

export function EventSlideshow({ eventCode, eventName, photos }: Props) {
  const router = useRouter();
  const [scope, setScope] = useState<"all" | "favourites">("all");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visiblePhotos = useMemo(
    () => (scope === "favourites" ? photos.filter((photo) => photo.isFavourite) : photos),
    [photos, scope]
  );
  const photo = visiblePhotos[index];

  useEffect(() => {
    if (!playing || visiblePhotos.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % visiblePhotos.length),
      SLIDE_DURATION_MS
    );
    return () => window.clearInterval(timer);
  }, [playing, visiblePhotos.length]);

  useEffect(() => {
    function syncFullscreen() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const move = useCallback(
    (direction: -1 | 1) => {
      setIndex((current) =>
        visiblePhotos.length
          ? (current + direction + visiblePhotos.length) % visiblePhotos.length
          : 0
      );
    },
    [visiblePhotos.length]
  );

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("button, select, input, textarea, a")
      ) {
        return;
      }
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((current) => !current);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [move]);

  async function closeSlideshow() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      router.push(`/admin/events/${eventCode}`);
    } catch (cause) {
      console.error("slideshow exit failed:", cause);
      setError("Could not exit fullscreen mode. Press Escape and try again.");
    }
  }

  async function toggleFullscreen() {
    setError(null);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        setError("Fullscreen mode is not supported by this browser.");
      }
    } catch (cause) {
      console.error("slideshow fullscreen toggle failed:", cause);
      setError("Could not change fullscreen mode. Check your browser permissions and try again.");
    }
  }

  return (
    <main className="fixed inset-0 z-[100] flex min-h-screen flex-col bg-black text-white">
      <header className="z-10 flex items-center justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent px-4 py-4 sm:px-7">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">{eventName}</p>
          <p className="text-xs text-slate-400">Original-size photos · 6-second autoplay</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href={`/gallery/${eventCode}`}
            target="_blank"
            className="rounded-full border border-white/20 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 sm:px-4 sm:text-sm"
          >
            Gallery &amp; favourites
          </Link>
          <button
            type="button"
            onClick={() => void closeSlideshow()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Exit slideshow"
            title="Exit slideshow"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="absolute inset-0 flex items-center justify-center px-3 py-20 sm:px-14">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- slideshow displays private, presigned originals
          <img
            key={photo.id}
            src={photo.url}
            alt={photo.filename ?? ""}
            className="max-h-full max-w-full select-none object-contain"
            draggable={false}
            onLoad={() => setError(null)}
            onError={() => setError("This photo could not be loaded. Try refreshing the slideshow.")}
          />
        ) : (
          <div className="max-w-md px-6 text-center">
            <Heart className="mx-auto h-9 w-9 text-rose-300" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-semibold">
              {scope === "favourites" ? "No favourites selected" : "No photos available"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {scope === "favourites"
                ? "Mark photos as favourites in the event gallery, then come back to play them here."
                : "This event does not have any ready-to-view photos yet."}
            </p>
            <Link
              href={`/gallery/${eventCode}`}
              target="_blank"
              className="mt-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
            >
              Open event gallery
            </Link>
          </div>
        )}
      </div>

      {photo && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/70 sm:left-6 sm:h-14 sm:w-14"
          >
            <ChevronLeft className="h-7 w-7" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/70 sm:right-6 sm:h-14 sm:w-14"
          >
            <ChevronRight className="h-7 w-7" aria-hidden="true" />
          </button>
        </>
      )}

      <footer className="z-10 mt-auto bg-gradient-to-t from-black/90 to-transparent px-4 pb-5 pt-12 sm:px-7">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPlaying((current) => !current)}
              disabled={visiblePhotos.length < 2}
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition hover:bg-slate-200 disabled:opacity-40"
            >
              {playing ? (
                <Pause className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <div>
              <div className="text-sm font-medium">
                {photo ? photo.filename ?? "Event photo" : eventName}
              </div>
              {photo && !photo.usesOriginal && (
                <div className="text-xs text-amber-200">
                  Optimized preview used for this HEIC/HEIF photo
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="slideshow-scope">
              Photos to show
            </label>
            <select
              id="slideshow-scope"
              value={scope}
              onChange={(event) => {
                setIndex(0);
                setScope(event.target.value as "all" | "favourites");
              }}
              className="rounded-full border border-white/20 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="all">All photos ({photos.length})</option>
              <option value="favourites">
                Favourites ({photos.filter((item) => item.isFavourite).length})
              </option>
            </select>
            <span className="min-w-14 text-center text-sm tabular-nums text-slate-300">
              {photo ? `${index + 1} / ${visiblePhotos.length}` : "0 / 0"}
            </span>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-200 hover:bg-white/10"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Maximize className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-center text-sm text-rose-300">
            {error}
          </p>
        )}
        <div className="mx-auto mt-4 h-0.5 max-w-5xl overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full bg-indigo-400 transition-[width] duration-300"
            style={{
              width: visiblePhotos.length ? `${((index + 1) / visiblePhotos.length) * 100}%` : "0%",
            }}
          />
        </div>
      </footer>
    </main>
  );
}
