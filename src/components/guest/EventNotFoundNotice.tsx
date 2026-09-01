export function EventNotFoundNotice() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="text-2xl font-semibold mb-2">Event not found</h1>
      <p className="text-white/60 max-w-sm">
        We couldn&apos;t find this event. Please double-check the link or ask your host for the
        correct QR code.
      </p>
    </main>
  );
}
