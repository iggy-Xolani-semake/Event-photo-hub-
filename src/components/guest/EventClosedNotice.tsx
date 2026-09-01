interface Props {
  eventName: string;
  reason: string | null;
}

export function EventClosedNotice({ eventName, reason }: Props) {
  const message =
    reason === "limit_reached"
      ? "This event's gallery is full — no more photos can be added right now."
      : reason === "archived"
        ? "This event is no longer available."
        : "This event is no longer accepting photographs.";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-2xl font-semibold mb-2">{eventName}</h1>
      <p className="text-white/60 max-w-sm">{message}</p>
      <p className="text-white/40 text-sm mt-6">
        If you&apos;re the host, ask your event organizer for gallery access.
      </p>
    </main>
  );
}
