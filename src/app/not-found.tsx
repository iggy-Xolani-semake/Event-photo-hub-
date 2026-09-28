import { Compass } from "lucide-react";
import Link from "next/link";

// Next.js renders this automatically for any unmatched route, and also
// when code calls notFound() (e.g. the admin event page when a client
// requests an event code that doesn't belong to them — see
// src/app/admin/events/[code]/page.tsx).
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">404</p>
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-400">
        <Compass className="h-7 w-7" strokeWidth={1.8} />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-white md:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-sm text-sm text-slate-400 md:text-base">
        This page doesn&apos;t exist, or the link may be out of date. If you&apos;re trying to
        reach a memory gallery, double-check the link or QR code with your host.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
        >
          Go home
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-slate-800 active:scale-[0.98]"
        >
          Host dashboard
        </Link>
      </div>
    </main>
  );
}
