import Link from "next/link";
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
 * The job of this screen is not to explain EventPhoto Hub. It is to answer
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
  eventName,
  eventDate,
  sharedCount,
  galleryAvailable,
  brandCompanyName,
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
    <main className="min-h-screen px-6 pb-8 pt-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col">
        <header>
          {brandCompanyName && (
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
              {brandCompanyName}
            </p>
          )}
          <h1 className="mt-3 font-display text-4xl leading-tight">{eventName}</h1>
          {formattedDate && <p className="mt-2 text-sm text-white/50">{formattedDate}</p>}
        </header>

        {showGallery ? (
          <Link href={galleryHref} className="mt-8 block" aria-label="Open the event gallery">
            <div className="grid grid-cols-3 gap-1.5">
              {teasers.slice(0, 6).map((teaser, index) => (
                <div
                  key={teaser.thumbnailUrl}
                  className="relative aspect-square overflow-hidden rounded-xl bg-white/5"
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
          <div className="mt-8 flex aspect-[3/2] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 text-center">
            <span aria-hidden="true" className="text-3xl">
              📷
            </span>
            <p className="mt-3 text-sm text-white/50">
              {showGallery
                ? "No photos yet — yours could be the first."
                : "Your photos go straight to the host."}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-lg font-medium">
          {showGallery
            ? `${sharedCount} photo${sharedCount === 1 ? "" : "s"} shared so far`
            : galleryAvailable && countIsKnown
              ? "Be the first to share a photo"
              : "Add your photos to the event"}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {showGallery && (
            <Link
              href={galleryHref}
              className={`tap-target flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-semibold transition-transform active:scale-[0.98] ${
                galleryIsPrimary
                  ? "bg-accent text-ink-950 shadow-lg shadow-accent/20"
                  : "border border-white/20 bg-white/10 text-white"
              }`}
            >
              <span aria-hidden="true" className="text-xl">
                🖼️
              </span>
              See the photos
            </Link>
          )}

          <button
            type="button"
            onClick={onAddPhotos}
            className={`tap-target flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-semibold transition-transform active:scale-[0.98] ${
              galleryIsPrimary
                ? "border border-white/20 bg-white/10 text-white"
                : "bg-accent text-ink-950 shadow-lg shadow-accent/20"
            }`}
          >
            <span aria-hidden="true" className="text-xl">
              ＋
            </span>
            Add my photos
          </button>
        </div>

        <div className="mt-auto pt-10 text-center">
          <p className="text-xs text-white/40">No account needed · Free to share</p>
          <p className="mt-2 text-xs text-white/25">
            <a href="/privacy" className="underline">
              How we handle your photos
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
