import Link from "next/link";
import { Camera, Images, Plus } from "lucide-react";
import { GUEST_CANNOT_DOWNLOAD_NOTE } from "@/lib/guest/photoRights";
import { formatEventDate } from "@/lib/format";

export interface LandingTeaser {
  thumbnailUrl: string;
  aspectRatio: string | null;
}

interface Props {
  eventName: string;
  eventDate: string | null;
  /**
   * Number of photos currently visible in the gallery, or `null` when this
   * guest has no gallery to look at (a "private" event) — in that case we
   * must not claim a count we can't show them.
   */
  sharedCount: number | null;
  galleryAvailable: boolean;
  brandCompanyName: string | null;
  teasers: LandingTeaser[];
  galleryHref: string;
  onAddPhotos: () => void;
}

/**
 * FROG #1 + #2 — the screen a guest lands on after scanning the QR code.
 *
 * The job of this screen is not to explain Memora. It is to answer
 * three questions in under five seconds and then get out of the way:
 *   1. "Where am I?"        → event name + date
 *   2. "Is this worth it?"  → other people's photos, already here
 *   3. "What do I do?"      → two buttons, no account, no sign-in
 *
 * Deliberately absent: marketing copy, feature lists, sign-in, pricing,
 * anything about the host's package. Guests are the distribution engine —
 * the only wall in this flow is the one the host pays to remove later.
 */
export function EventLandingScreen({
  eventDate,
  sharedCount,
  galleryAvailable,
  teasers,
  galleryHref,
  onAddPhotos,
}: Props) {
  const formattedDate = formatEventDate(eventDate);
  const countIsKnown = sharedCount !== null;
  // Only offer the gallery when there is actually something in it. Sending a
  // guest to an empty grid under a "See the photos" button is a dead end
  // dressed up as a choice — with nothing to look at, the single useful
  // action is to add the first photo.
  const showGallery = galleryAvailable && countIsKnown && (sharedCount ?? 0) > 0;
  const extraCount = showGallery ? (sharedCount ?? 0) - teasers.length : 0;

  // Value first: when there is a gallery to look at, "See the photos" is the
  // primary action and curiosity does the selling. With an empty (or hidden)
  // gallery the upload button becomes primary instead.
  const galleryIsPrimary = showGallery;

  return (
    <div className="px-4 pb-8 pt-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col">
        {formattedDate && (
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{formattedDate}</p>
        )}

        {showGallery ? (
          <Link href={galleryHref} className="mt-8 block" aria-label="Open the memory gallery">
            <div className="grid grid-cols-3 gap-1.5">
              {teasers.slice(0, 6).map((teaser, index) => (
                <div
                  key={teaser.thumbnailUrl}
                  className="relative aspect-square overflow-hidden rounded-xl bg-slate-800/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- masonry-style teaser tiles, next/image forces a fixed box */}
                  <img
                    src={teaser.thumbnailUrl}
                    alt=""
                    loading={index < 3 ? "eager" : "lazy"}
                    className="h-full w-full object-cover"
                  />
                  {index === 5 && extraCount > 0 && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold">
                      +{extraCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Link>
        ) : (
          <div className="mt-8 flex aspect-[3/2] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-400">
              <Camera className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <p className="mt-3 text-sm text-slate-500">
              {showGallery
                ? "No photos yet — yours could be the first."
                : "Your memories go straight to the host."}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-lg font-medium">
          {showGallery
            ? `${sharedCount} photo${sharedCount === 1 ? "" : "s"} shared so far`
            : galleryAvailable && countIsKnown
              ? "Be the first to share a photo"
              : "Add your memories to the event"}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {showGallery && (
            <Link
              href={galleryHref}
              className={`tap-target flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-semibold transition-all active:scale-[0.98] ${
                galleryIsPrimary
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "border border-slate-700 bg-slate-800/60 text-white"
              }`}
            >
              <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center">
                <Images className="h-5 w-5" strokeWidth={2.2} />
              </span>
              See the photos
            </Link>
          )}

          <button
            type="button"
            onClick={onAddPhotos}
            className={`tap-target flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-semibold transition-all active:scale-[0.98] ${
              galleryIsPrimary
                ? "border border-slate-700 bg-slate-800/60 text-white hover:border-slate-600 hover:bg-slate-800"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:from-violet-500 hover:to-indigo-500"
            }`}
          >
            <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center">
              <Plus className="h-5 w-5" strokeWidth={2.6} />
            </span>
            Add my photos
          </button>
        </div>

        <div className="mt-auto pt-10 text-center">
          <p className="text-xs text-slate-500">No account needed · Free to share</p>
          <p className="mt-2 text-xs text-slate-500">{GUEST_CANNOT_DOWNLOAD_NOTE}</p>
          <p className="mt-2 text-xs text-white/25">
            <a href="/privacy" className="underline">
              How we handle your memories
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
