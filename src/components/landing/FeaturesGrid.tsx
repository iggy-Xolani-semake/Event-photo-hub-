import { FileArchive, Gauge, Lock, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { FEATURE_PHOTOS } from "./mockup/demoPhotos";
import { PhotoTile } from "./mockup/PhotoTile";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

interface Feature {
  icon: ReactNode;
  title: string;
  body: string;
  points: string[];
  /** Key into FEATURE_PHOTOS — the event photo that illustrates the benefit. */
  photo: keyof typeof FEATURE_PHOTOS;
  /** Short product-language label pinned to the photo. */
  photoBadge: string;
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
    photo: "onboarding",
    photoBadge: "No app · no sign-up",
  },
  {
    icon: <Gauge className="h-5 w-5" strokeWidth={2.2} />,
    title: "High-Speed Performance",
    body: "Photos travel straight from the guest's phone to object storage, so a packed venue doesn't mean a queue of failed uploads.",
    points: ["Direct Cloudflare R2 uploads", "Automatic WebP compression"],
    photo: "performance",
    photoBadge: "Direct to R2",
  },
  {
    icon: <Lock className="h-5 w-5" strokeWidth={2.2} />,
    title: "Complete Host Control",
    body: "Decide exactly who can see the gallery and for how long — then change your mind at any point without losing a photo.",
    points: ["Private, Shared or Public visibility", "Custom expiration deadlines"],
    photo: "control",
    photoBadge: "Private · Shared · Public",
  },
  {
    icon: <FileArchive className="h-5 w-5" strokeWidth={2.2} />,
    title: "High-Res Original Downloads",
    body: "Browse a fast, lightweight gallery all night, then take home every untouched original in one archive.",
    points: ["Crisp thumbnail browsing", "Full original file ZIP unlocks"],
    photo: "downloads",
    photoBadge: "Originals kept",
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

                {/* Full-bleed event photo, cropped by object-cover. The tile
                    carries its own bg-black/20 scrim, and the card's dark
                    surface fades up over the bottom edge so the photo reads as
                    part of the card rather than a pasted-in banner. */}
                <div className="relative -mx-6 -mt-6 mb-6 h-40 overflow-hidden sm:h-44">
                  <PhotoTile
                    photo={FEATURE_PHOTOS[feature.photo] ?? FEATURE_PHOTOS.onboarding!}
                    alt={FEATURE_PHOTOS[feature.photo]?.alt ?? ""}
                    sizes="(min-width: 640px) 560px, 92vw"
                    rounded="rounded-none"
                    className="h-full w-full"
                  />
                  <span
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent"
                    aria-hidden="true"
                  />

                  {/* Hover badge — stays legible over any frame thanks to the
                      tile's flat scrim. */}
                  <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-100 ring-1 ring-white/15 backdrop-blur-sm">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-indigo-400"
                      aria-hidden="true"
                    />
                    {feature.photoBadge}
                  </span>
                </div>

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
