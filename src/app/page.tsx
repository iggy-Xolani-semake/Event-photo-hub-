import type { Metadata } from "next";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { Faq } from "@/components/landing/Faq";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { FooterCta } from "@/components/landing/FooterCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
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
 * Marketing landing page, composed from the global header/footer and the
 * shared design-system primitives. Server component end to end except five
 * small client islands (header chrome, demo trigger, animated showcase, FAQ
 * accordion, scroll reveals), so the entire pitch ships in the first HTML.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main"
        className="sr-only z-[90] rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <AppHeader />

      <main id="main">
        <Hero />
        <TrustBar />
        <HowItWorks />
        <FeaturesGrid />
        <Pricing />
        <Faq />
        <FooterCta />
      </main>

      <AppFooter />
    </div>
  );
}
