import Link from "next/link";
import { ArrowRight, Check, QrCode } from "lucide-react";
import { Reveal } from "./Reveal";

const PROMISES = ["Free to create", "Two-minute setup", "Guests never sign up"] as const;

/**
 * Closing CTA. Deliberately the darkest block on the page in both themes:
 * after a lot of white space and cards, a solid panel is where the eye lands,
 * and it's the last decision point before a visitor leaves.
 */
export function FooterCta() {
  return (
    <section className="relative py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-16 text-center shadow-card-lg sm:px-12 sm:py-20 dark:bg-ink-900 dark:ring-1 dark:ring-white/10">
            {/* ambient gradients + grid, all inside the rounded panel */}
            <div className="surface-grid-invert pointer-events-none absolute inset-0" aria-hidden="true" />
            <div
              className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-600/40 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-fuchsia-600/30 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative mx-auto flex max-w-2xl flex-col items-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-200 backdrop-blur">
                <QrCode className="h-3.5 w-3.5" strokeWidth={2.4} />
                Your next event
              </span>

              <h2 className="mt-6 text-[2.1rem] font-extrabold leading-[1.06] tracking-[-0.04em] text-white sm:text-5xl">
                Ready to capture every angle of your next event?
              </h2>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/60">
                Set up your gallery now, print the QR poster, and let your guests do the rest.
                You&apos;ll see the photos arriving before the speeches are over.
              </p>

              <Link
                href="/signup"
                className="group mt-9 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-[15px] font-bold text-slate-900 shadow-[0_18px_40px_-16px_rgba(255,255,255,0.6)] transition hover:-translate-y-0.5 hover:bg-violet-50 hover:shadow-[0_24px_56px_-16px_rgba(167,139,250,0.75)] active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:w-auto"
              >
                Launch Your Memora Gallery Now
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2.6}
                />
              </Link>

              <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {PROMISES.map((promise) => (
                  <li
                    key={promise}
                    className="flex items-center gap-1.5 text-xs font-medium text-white/45"
                  >
                    <Check className="h-3.5 w-3.5 text-violet-300" strokeWidth={3} />
                    {promise}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default FooterCta;
