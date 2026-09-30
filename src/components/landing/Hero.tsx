import { ArrowRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { DemoCta } from "./DemoCta";
import { HeroShowcase } from "./HeroShowcase";

const ASSURANCES = [
  "Free to create your event",
  "Packages for every event",
  "Guests never make an account",
] as const;

/**
 * Hero. Server component: the headline, subhead and primary CTA are the most
 * important HTML on the page and arrive with the first response; only the demo
 * trigger and the animated showcase are client islands.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-14 lg:pb-24 lg:pt-20">
      <div className="surface-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-100/60 via-slate-50 to-slate-50"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="animate-slide-up" style={{ animationFillMode: "both" }}>
            <Badge tone="info" dot pulse>
              Mobile-first event photo sharing
            </Badge>
          </span>

          <h1
            className="mt-6 animate-slide-up text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "70ms", animationFillMode: "both" }}
          >
            Collect <span className="brand-text">Every Guest Photo</span> from Your Event — Without
            the Hassle
          </h1>

          <p
            className="mt-6 max-w-2xl animate-slide-up text-base leading-relaxed text-slate-400 md:text-lg"
            style={{ animationDelay: "140ms", animationFillMode: "both" }}
          >
            No app downloads. No account sign-ups for guests. Just one simple QR code to capture
            every unedited, full-resolution memory.
          </p>

          <div
            className="mt-9 flex w-full animate-slide-up flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
            style={{ animationDelay: "210ms", animationFillMode: "both" }}
          >
            <ButtonLink href="/signup" size="lg" className="w-full sm:w-auto">
              Create Your Event Free
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </ButtonLink>
            <DemoCta className="w-full sm:w-auto" />
          </div>

          <ul
            className="mt-7 flex animate-slide-up flex-wrap items-center justify-center gap-x-5 gap-y-2"
            style={{ animationDelay: "280ms", animationFillMode: "both" }}
          >
            {ASSURANCES.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={3} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-14 lg:mt-20">
          <HeroShowcase />
        </div>
      </div>
    </section>
  );
}

export default Hero;
