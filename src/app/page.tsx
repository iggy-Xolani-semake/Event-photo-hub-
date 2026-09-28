import type { Metadata } from "next";
import { Faq } from "@/components/landing/Faq";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { FooterCta } from "@/components/landing/FooterCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { TrustBar } from "@/components/landing/TrustBar";

const TITLE = "Memora — Collect Every Guest Photo from Your Event";
const DESCRIPTION =
  "No app downloads. No account sign-ups for guests. Just one QR code to capture every unedited, full-resolution memory from your event. R50 per event.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "event photo sharing",
    "wedding photo QR code",
    "guest photo upload",
    "event gallery",
    "shared photo album",
    "Memora",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Memora",
    locale: "en_ZA",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

/**
 * Marketing landing page.
 *
 * Server component end to end except for four small client islands (header
 * chrome/theme, the demo trigger, the animated showcase, the code lookup and
 * the FAQ accordion). Keeping the composition here means the entire page —
 * headline, pricing, FAQ answers — is in the initial HTML for crawlers and for
 * anyone on a slow connection, and nothing above the fold waits on JS.
 *
 * The wrapper paints its own background because the root layout keeps the app
 * shell (guest uploads, admin console) permanently dark; the marketing surface
 * is light-first with an opt-in dark theme.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-violet-500/20 dark:bg-ink-950 dark:text-white">
      <a
        href="#main"
        className="sr-only z-[60] rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 dark:bg-white dark:text-slate-900"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main">
        <Hero />
        <TrustBar />
        <HowItWorks />
        <FeaturesGrid />
        <Pricing />
        <Faq />
        <FooterCta />
      </main>

      <SiteFooter />
    </div>
  );
}
