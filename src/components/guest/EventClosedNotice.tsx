interface Props {
  eventName: string;
  reason: string | null;
  /**
   * Present when the gallery is still viewable even though uploads have
   * stopped. A guest who scans the QR an hour after the host closes the
   * event should land somewhere useful, not on a dead end — the photos are
   * the reason they scanned in the first place.
   */
  galleryHref?: string | null;
}

export function EventClosedNotice({ eventName, reason, galleryHref }: Props) {
  const isArchived = reason === "archived";
  const message =
    reason === "limit_reached"
      ? "This event's gallery is full — no more photos can be added right now."
      : reason === "upload_expired"
        ? "The upload period for this event has ended."
      : isArchived
        ? "This event is no longer available."
        : "This event is no longer accepting photographs.";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-5xl">{isArchived ? "🔒" : "⏰"}</div>
      <h1 className="mb-2 font-display text-3xl leading-tight">{eventName}</h1>
      <p className="max-w-sm text-slate-400">{message}</p>

      {galleryHref && (
        <a
          href={galleryHref}
          className="tap-target mt-10 w-full max-w-sm rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/20 transition-transform active:scale-[0.98]"
        >
          See the photos
        </a>
      )}

      {!galleryHref && (
        <p className="mt-6 text-sm text-slate-500">
          If you&apos;re the host, ask your event organiser for gallery access.
        </p>
      )}
    </main>
  );
}
