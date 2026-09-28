import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, FileArchive, Printer, ShieldCheck } from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const INCLUDED = [
  { label: "Up to 50 Photo Uploads", icon: BadgeCheck },
  { label: "0 Guest App Downloads", icon: ShieldCheck },
  { label: "30 Days Gallery Storage", icon: BadgeCheck },
  { label: "Original High-Res ZIP Download", icon: FileArchive },
  { label: "Printable QR Poster", icon: Printer },
] as const;

/**
 * One tier, shown as one card. A single price point is a conversion advantage
 * here — there is nothing to compare and nothing to misjudge — so the layout
 * leans into it rather than padding the row out with decoy plans.
 */
export function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden py-20 lg:py-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/3 -z-10 h-[380px] bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,rgba(124,58,237,0.10),transparent_70%)] dark:bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,rgba(124,58,237,0.22),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Pricing"
            title="One pass per event. That's the whole price list."
            description="Creating your event, collecting uploads and browsing the gallery are free. You only pay when you're ready to take the originals home."
          />
        </Reveal>

        <Reveal delay={90} className="mt-14 lg:mt-16">
          <div className="mx-auto max-w-lg">
            {/* Gradient hairline border: the outer wrapper paints the ramp and the
                inner card sits 1px inside it. No Tailwind bg-* utility may be added
                to the wrapper — it would win the cascade over .brand-gradient-animated
                and flatten the border to a single colour. */}
            <div className="brand-gradient-animated relative animate-gradient-pan rounded-[1.4rem] p-px shadow-glow-lg">
              <div className="relative overflow-hidden rounded-[calc(1.4rem-1px)] bg-white px-7 py-8 sm:px-9 sm:py-10 dark:bg-ink-900">
                <div
                  className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/15"
                  aria-hidden="true"
                />

                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
                      Pay-Per-Event Pass
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-white/45">
                      Everything included, one event
                    </p>
                  </div>
                  <span className="brand-gradient shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-glow">
                    Best value
                  </span>
                </div>

                <div className="relative mt-7 flex items-end gap-2">
                  <span className="text-[3.5rem] font-extrabold leading-[0.85] tracking-[-0.05em] text-slate-900 dark:text-white">
                    R50
                  </span>
                  <span className="pb-1.5 text-base font-semibold text-slate-500 dark:text-white/45">
                    / event
                  </span>
                  <span className="mb-1.5 ml-auto rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:bg-white/[0.06] dark:text-white/45">
                    Once-off
                  </span>
                </div>

                <p className="relative mt-4 text-sm leading-relaxed text-slate-600 dark:text-white/55">
                  No subscription, no per-guest fees, no surprise storage invoice three months later.
                </p>

                <ul className="relative mt-7 space-y-3.5 border-t border-slate-100 pt-7 dark:border-white/[0.07]">
                  {INCLUDED.map((item) => (
                    <li key={item.label} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                        <Check className="h-3.5 w-3.5" strokeWidth={3.2} />
                      </span>
                      <span className="text-sm font-medium text-slate-800 dark:text-white/80">
                        {item.label}
                      </span>
                      <item.icon
                        className="ml-auto h-4 w-4 shrink-0 text-slate-300 dark:text-white/20"
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className="brand-gradient group relative mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-[15px] font-bold text-white shadow-glow transition hover:-translate-y-0.5 hover:shadow-glow-lg active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-ink-900"
                >
                  Get Started Now
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    strokeWidth={2.6}
                  />
                </Link>

                <p className="relative mt-4 text-center text-xs text-slate-400 dark:text-white/35">
                  Free to create · pay only to unlock the originals
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default Pricing;
