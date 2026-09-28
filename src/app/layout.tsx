import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memora",
  description: "Memora — collect, share, and relive the moments that matter.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // guests shouldn't accidentally pinch-zoom the upload UI mid-tap
  themeColor: "#0a0a0c",
};

/**
 * Resolves the theme before first paint so a dark-mode visitor never sees a
 * white flash. Reads the explicit choice from localStorage and falls back to
 * the OS preference. Runs as a plain inline script because it has to execute
 * before React hydrates — next/script's beforeInteractive is too late for
 * this, and a client component would paint the wrong theme first.
 */
const themeInitScript = `(function(){try{var s=localStorage.getItem("memora-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script mutates <html class> before
    // React hydrates, so the server and client markup differ by design. It is
    // scoped to this element only and never hides real hydration bugs below it.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-ink-950 text-white antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
