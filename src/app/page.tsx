import type { Metadata } from "next";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { FloatingUtilities } from "@/components/layout/FloatingUtilities";
import { SkipLink } from "@/components/ui/SkipLink";
import { Faq } from "@/components/landing/Faq";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { FooterCta } from "@/components/landing/FooterCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { TrustBar } from "@/components/landing/TrustBar";

const TITLE = "shutaMzala — Collect Every Guest Photo from Your Event";
const DESCRIPTION =
  "No app downloads. No account sign-ups for guests. Just one QR code to capture every unedited, full-resolution memory from your event. Choose the package that fits your event.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "event photo sharing",
    "wedding photo QR code",
    "guest photo upload",
    "event gallery",
    "shared photo album",
    "shutaMzala",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "shutaMzala",
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
 * shared design-system primitives. Server component end to end except a few
 * small client islands (header chrome, demo trigger, animated showcase, FAQ
 * accordion, scroll reveals, the floating utilities and the cookie notice), so
 * the entire pitch ships in the first HTML.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SkipLink />

      <AppHeader />

      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Hero />
        <TrustBar />
        <HowItWorks />
        <FeaturesGrid />
        <Pricing />
        <Faq />
        <FooterCta />
      </main>

      <AppFooter />

      <FloatingUtilities />
      <CookieNotice />
    </div>
  );
}
