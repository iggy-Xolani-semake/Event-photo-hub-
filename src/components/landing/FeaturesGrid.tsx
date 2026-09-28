import { FileArchive, Gauge, Lock, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

interface Feature {
  icon: ReactNode;
  title: string;
  body: string;
  points: string[];
}

/**
 * The 2x2 grid. Each card pairs a benefit with the mechanism behind it
 * (HttpOnly sessions, signed R2 uploads, WebP previews) so the claim is
 * checkable rather than hand-wavy.
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
      className="relative border-y border-slate-800 bg-slate-900/30 py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
              <Card className="group relative flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:border-indigo-500/40">
                <div
                  className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />

                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/30 transition duration-300 group-hover:shadow-lg group-hover:shadow-indigo-500/25">
                  {feature.icon}
                </span>

                <h3 className="relative mt-6 text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
                  {feature.title}
                </h3>
                <p className="relative mt-3 text-sm leading-relaxed text-slate-400">{feature.body}</p>

                <ul className="relative mt-6 space-y-2.5 border-t border-slate-800 pt-5">
                  {feature.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-center gap-2.5 text-sm font-medium text-slate-300"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesGrid;
