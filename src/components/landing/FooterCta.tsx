import { ArrowRight, Check, QrCode } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "./Reveal";

const PROMISES = ["Free to create", "Two-minute setup", "Guests never sign up"] as const;

/**
 * Closing CTA: the one glass panel that floats highest off the canvas, so
 * after a page of cards the eye lands here — the last decision point before a
 * visitor leaves.
 */
export function FooterCta() {
  return (
    <section className="relative py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-16 text-center shadow-xl backdrop-blur-md sm:px-12 sm:py-20">
            <div className="surface-grid pointer-events-none absolute inset-0" aria-hidden="true" />
            <div
              className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-indigo-600/25 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative mx-auto flex max-w-2xl flex-col items-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
                <QrCode className="h-3.5 w-3.5" strokeWidth={2.4} />
                Your next event
              </span>

              <h2 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
                Ready to capture every angle of your next event?
              </h2>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">
                Set up your gallery now, print the QR poster, and let your guests do the rest.
                You&apos;ll see the photos arriving before the speeches are over.
              </p>

              <ButtonLink href="/signup" size="lg" className="mt-9">
                Launch Your Memora Gallery Now
                <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
              </ButtonLink>

              <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {PROMISES.map((promise) => (
                  <li key={promise} className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={3} />
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
