import Link from "next/link";

// Next.js renders this automatically for any unmatched route, and also
// when code calls notFound() (e.g. the admin event page when a client
// requests an event code that doesn't belong to them — see
// src/app/admin/events/[code]/page.tsx).
export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-white/30 text-sm tracking-widest mb-2">404</p>
      <div className="text-5xl mb-4">📷</div>
      <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
      <p className="text-white/60 max-w-sm mb-8">
        This page doesn&apos;t exist, or the link may be out of date. If you&apos;re trying to
        reach an event gallery, double-check the link or QR code with your host.
      </p>
      <Link
        href="/"
        className="tap-target bg-accent text-ink-950 font-semibold rounded-xl px-6 py-3 inline-flex items-center"
      >
        Go Home
      </Link>
    </main>
  );
}
