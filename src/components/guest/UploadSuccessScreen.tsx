"use client";

interface Props {
  eventName: string;
  successCount: number;
  failedCount: number;
  galleryHref: string;
  galleryAvailable: boolean;
  galleryCount: number | null;
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
  onAddMore,
  onRetryFailed,
}: Props) {
  const allFailed = successCount === 0;

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
          className="tap-target rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-10 py-4 text-lg font-semibold text-white transition-transform active:scale-[0.98]"
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

      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        {galleryAvailable && (
          <a
            href={galleryHref}
            className="tap-target flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/20 transition-transform active:scale-[0.98]"
          >
            {galleryCount !== null ? `See all ${galleryCount} photos` : "See the gallery"}
          </a>
        )}

        {failedCount > 0 && (
          <button
            type="button"
            onClick={onRetryFailed}
            className="tap-target w-full rounded-2xl border border-amber-400/40 bg-amber-400/10 px-6 py-4 text-base font-semibold text-amber-100"
          >
            Retry the {failedCount} that failed
          </button>
        )}

        <button
          type="button"
          onClick={onAddMore}
          className={`tap-target w-full rounded-2xl px-6 py-4 text-lg font-semibold transition-transform active:scale-[0.98] ${
            galleryAvailable
              ? "border border-slate-700 bg-slate-800/60 text-white"
              : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20"
          }`}
        >
          Add more photos
        </button>
      </div>
    </div>
  );
}
