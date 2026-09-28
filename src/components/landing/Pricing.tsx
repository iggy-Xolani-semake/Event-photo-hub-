import { ArrowRight, BadgeCheck, Check, FileArchive, Printer, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
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
 * One tier, one card. A single price point is a conversion advantage — there
 * is nothing to compare and nothing to misjudge — so the layout leans into it
 * instead of padding the row with decoy plans.
 */
export function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden py-20 lg:py-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/3 -z-10 h-[380px] bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,rgba(124,58,237,0.14),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Pricing"
            title="One pass per event. That's the whole price list."
            description="Creating your event, collecting uploads and browsing the gallery are free. You only pay when you're ready to take the originals home."
          />
        </Reveal>

        <Reveal delay={90} className="mt-14 lg:mt-16">
          <div className="mx-auto max-w-lg">
            {/* gradient hairline border: wrapper paints the ramp, card sits 1px inside */}
            <div className="brand-gradient-animated relative animate-gradient-pan rounded-2xl p-px shadow-glow-lg">
              <div className="relative overflow-hidden rounded-[calc(1rem-1px)] bg-slate-900/90 px-7 py-8 backdrop-blur-md sm:px-9 sm:py-10">
                <div
                  className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"
                  aria-hidden="true"
                />

                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-indigo-300">
                      Pay-Per-Event Pass
                    </p>
                    <p className="mt-1 text-sm text-slate-400">Everything included, one event</p>
                  </div>
                  <Badge tone="info">Best value</Badge>
                </div>

                <div className="relative mt-7 flex items-end gap-2">
                  <span className="text-5xl font-bold leading-[0.85] tracking-tight text-white md:text-6xl">
                    R50
                  </span>
                  <span className="pb-1 text-base font-medium text-slate-400">/ event</span>
                  <span className="mb-1.5 ml-auto rounded-lg bg-slate-800/60 px-2 py-1 text-xs font-medium uppercase tracking-wider text-slate-400 ring-1 ring-slate-700">
                    Once-off
                  </span>
                </div>

                <p className="relative mt-4 text-sm leading-relaxed text-slate-400">
                  No subscription, no per-guest fees, no surprise storage invoice three months later.
                </p>

                <ul className="relative mt-7 space-y-3.5 border-t border-slate-800 pt-7">
                  {INCLUDED.map((item) => (
                    <li key={item.label} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                        <Check className="h-3.5 w-3.5" strokeWidth={3.2} />
                      </span>
                      <span className="text-sm font-medium text-slate-200">{item.label}</span>
                      <item.icon
                        className="ml-auto h-4 w-4 shrink-0 text-slate-600"
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                    </li>
                  ))}
                </ul>

                <ButtonLink href="/signup" size="lg" className="relative mt-8 w-full">
                  Get Started Now
                  <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
                </ButtonLink>

                <p className="relative mt-4 text-center text-xs text-slate-500">
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
