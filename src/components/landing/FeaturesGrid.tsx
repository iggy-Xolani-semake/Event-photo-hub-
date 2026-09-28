import { FileArchive, Gauge, Lock, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

interface Feature {
  icon: ReactNode;
  title: string;
  body: string;
  points: string[];
}

/**
 * The 2x2 grid. Each card pairs a marketing benefit with the mechanism behind
 * it (HttpOnly sessions, signed R2 uploads, WebP previews) so the claim is
 * checkable rather than hand-wavy — that specificity is what convinces a
 * technical host, and it costs a non-technical one nothing.
 */
const FEATURES: Feature[] = [
  {
    icon: <UserPlus className="h-5 w-5" strokeWidth={2.2} />,
    title: "Instant Guest Onboarding",
    body: "Guests go from QR scan to first photo in a couple of taps, uploading directly from their camera or camera roll.",
    points: ["Direct camera & gallery upload", "HttpOnly session security"],
  },
  {
    icon: <Gauge className="h-5 w-5" strokeWidth={2.2} />,
    title: "High-Speed Performance",
    body: "Photos travel straight from the guest's phone to object storage, so a packed venue doesn't mean a queue of failed uploads.",
    points: ["Direct Cloudflare R2 uploads", "Automatic WebP compression"],
  },
  {
    icon: <Lock className="h-5 w-5" strokeWidth={2.2} />,
    title: "Complete Host Control",
    body: "Decide exactly who can see the gallery and for how long — then change your mind at any point without losing a photo.",
    points: ["Private, Shared or Public visibility", "Custom expiration deadlines"],
  },
  {
    icon: <FileArchive className="h-5 w-5" strokeWidth={2.2} />,
    title: "High-Res Original Downloads",
    body: "Browse a fast, lightweight gallery all night, then take home every untouched original in one archive.",
    points: ["Crisp thumbnail browsing", "Full original file ZIP unlocks"],
  },
];

export function FeaturesGrid() {
  return (
    <section
      id="features"
      className="relative border-y border-slate-200/70 bg-slate-50/70 py-20 lg:py-28 dark:border-white/[0.07] dark:bg-white/[0.015]"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Features"
            title="Built for the room, not just the album"
            description="Everything here exists because a real event went wrong without it: a queue at the photographer's table, a blurry forwarded screenshot, a gallery that outlived the wedding."
          />
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:mt-16">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 2) * 110 + Math.floor(index / 2) * 60}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-card transition duration-300 hover:-translate-y-1.5 hover:border-violet-300 hover:shadow-card-lg dark:border-white/10 dark:bg-ink-900 dark:hover:border-violet-400/40 sm:p-8">
                <div
                  className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />

                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-violet-600 ring-1 ring-violet-100 transition duration-300 group-hover:from-indigo-500 group-hover:to-violet-600 group-hover:text-white group-hover:shadow-glow group-hover:ring-transparent dark:from-violet-500/15 dark:to-indigo-500/10 dark:text-violet-300 dark:ring-white/10">
                  {feature.icon}
                </span>

                <h3 className="relative mt-6 text-xl font-bold tracking-[-0.025em] text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="relative mt-3 text-sm leading-relaxed text-slate-600 dark:text-white/55">
                  {feature.body}
                </p>

                <ul className="relative mt-6 space-y-2.5 border-t border-slate-100 pt-5 dark:border-white/[0.07]">
                  {feature.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-center gap-2.5 text-[13px] font-medium text-slate-700 dark:text-white/70"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesGrid;
