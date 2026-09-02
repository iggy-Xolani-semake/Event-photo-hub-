import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_32%)]"
      />
      <div
        aria-hidden="true"
        className="absolute right-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />

      <section className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-16 sm:px-10 lg:px-16">
        <div className="grid w-full gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="animate-slide-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Event Photo Hub
            </div>

            <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Every moment, beautifully in one place.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-white/65 sm:text-lg">
              Collect, organise, and share the photographs that make your event
              unforgettable. Give guests a simple way to upload memories while
              your team keeps everything beautifully managed.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/login"
                className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3.5 font-semibold text-ink-950 shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-ink-950"
              >
                Sign in to manage events
                <span aria-hidden="true" className="ml-2">
                  →
                </span>
              </Link>
              <Link
                href="/privacy"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3.5 font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Privacy &amp; trust
              </Link>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-2xl font-semibold text-white">Simple</p>
                <p className="mt-1 text-sm text-white/50">Guest uploads</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">Secure</p>
                <p className="mt-1 text-sm text-white/50">Managed access</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">Shareable</p>
                <p className="mt-1 text-sm text-white/50">One event link</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md animate-fade-in">
            <div aria-hidden="true" className="absolute -inset-4 rounded-[2rem] bg-accent/10 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.07] p-3 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="rounded-[1.5rem] border border-white/10 bg-ink-900/90 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                      Your event
                    </p>
                    <p className="mt-2 text-xl font-semibold">A day to remember</p>
                  </div>
                  <div className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                    Live
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="h-36 rounded-2xl bg-gradient-to-br from-amber-200/80 via-orange-400/70 to-rose-500/70" />
                  <div className="mt-6 h-36 rounded-2xl bg-gradient-to-br from-sky-200/80 via-blue-500/70 to-indigo-700/80" />
                  <div className="-mt-3 h-36 rounded-2xl bg-gradient-to-br from-emerald-200/80 via-teal-500/70 to-cyan-700/80" />
                  <div className="h-36 rounded-2xl bg-gradient-to-br from-fuchsia-200/80 via-purple-500/70 to-violet-800/80" />
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-sm">
                  <span className="text-white/50">Memories collected</span>
                  <span className="font-semibold text-white">128 photos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
