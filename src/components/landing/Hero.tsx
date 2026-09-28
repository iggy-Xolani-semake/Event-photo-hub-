import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { DemoCta } from "./DemoCta";
import { GalleryLookup } from "./GalleryLookup";
import { HeroShowcase } from "./HeroShowcase";

const ASSURANCES = [
  "Free to create your event",
  "One R50 pass, no subscription",
  "Guests never make an account",
] as const;

/**
 * Server component on purpose: the headline, subhead and primary CTA are the
 * most important HTML on the page and should arrive in the first response with
 * no client JS attached. Only the two genuinely interactive pieces (the demo
 * trigger and the code lookup) are client islands.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-36 lg:pb-24">
      {/* blueprint grid + top glow, both masked so they dissolve into the page */}
      <div className="surface-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[420px] bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(124,58,237,0.16),transparent_70%)] dark:bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(124,58,237,0.28),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span
            className="inline-flex animate-slide-up items-center gap-2 rounded-full border border-slate-200 bg-white/80 py-1 pl-1 pr-3.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.05] dark:text-white/60"
            style={{ animationFillMode: "both" }}
          >
            <span className="brand-gradient inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
              <Sparkles className="h-3 w-3" strokeWidth={2.6} />
              New
            </span>
            Mobile-first event photo sharing
          </span>

          <h1
            className="mt-6 animate-slide-up text-[2.35rem] font-extrabold leading-[1.04] tracking-[-0.04em] text-slate-900 sm:text-6xl lg:text-[4.15rem] dark:text-white"
            style={{ animationDelay: "70ms", animationFillMode: "both" }}
          >
            Collect <span className="brand-text">Every Guest Photo</span> from Your Event — Without
            the Hassle
          </h1>

          <p
            className="mt-6 animate-slide-up max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-white/55"
            style={{ animationDelay: "140ms", animationFillMode: "both" }}
          >
            No app downloads. No account sign-ups for guests. Just one simple QR code to capture
            every unedited, full-resolution memory.
          </p>

          <div
            className="mt-9 flex animate-slide-up w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
            style={{ animationDelay: "210ms", animationFillMode: "both" }}
          >
            <Link
              href="/signup"
              className="brand-gradient-animated group inline-flex w-full animate-gradient-pan items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:shadow-glow-lg active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto dark:focus-visible:ring-offset-ink-950"
            >
              Create Your Event Free
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                strokeWidth={2.5}
              />
            </Link>

            <DemoCta className="w-full sm:w-auto" />
          </div>

          <ul
            className="mt-7 flex animate-slide-up flex-wrap items-center justify-center gap-x-5 gap-y-2"
            style={{ animationDelay: "280ms", animationFillMode: "both" }}
          >
            {ASSURANCES.map((item) => (
              <li
                key={item}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-white/45"
              >
                <Check className="h-3.5 w-3.5 text-violet-500" strokeWidth={3} />
                {item}
              </li>
            ))}
          </ul>

          <div
            className="w-full animate-slide-up"
            style={{ animationDelay: "350ms", animationFillMode: "both" }}
          >
            <GalleryLookup />
          </div>
        </div>

        <div className="mt-14 lg:mt-20">
          <HeroShowcase />
        </div>
      </div>
    </section>
  );
}

export default Hero;
