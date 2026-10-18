import Image from "next/image";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { DemoCta } from "./DemoCta";

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
    <section className="hero-photo-panel relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-slate-950">
      <Image
        src="/images/demo/gallery-03.webp"
        alt="Graduates celebrating with family and friends"
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 object-cover object-center"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/15"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/20"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex max-w-3xl flex-col items-start text-left">
          <span className="animate-slide-up" style={{ animationFillMode: "both" }}>
            <Badge tone="info" dot pulse>
              Mobile-first event photo sharing
            </Badge>
          </span>

          <h1
            className="mt-6 animate-slide-up text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-7xl"
            style={{ animationDelay: "70ms", animationFillMode: "both" }}
          >
            Every captured moment deserves to be{" "}
            <span className="brand-text">remembered — and shared.</span>
          </h1>

          <p
            className="hero-muted mt-6 max-w-2xl animate-slide-up text-base leading-relaxed md:text-lg"
            style={{ animationDelay: "140ms", animationFillMode: "both" }}
          >
            Collect every guest photo in one beautiful gallery. No app downloads, no guest
            sign-ups — just one QR code and all the moments you might otherwise miss.
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
              <li key={item} className="hero-muted flex items-center gap-1.5 text-xs font-medium">
                <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={3} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <a
          href="#event-story"
          className="hero-muted mt-12 inline-flex items-center gap-2 text-sm font-medium transition hover:text-white"
        >
          See how every moment comes together
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

export default Hero;
