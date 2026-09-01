import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Photo Hub",
  description: "Share your moments — instant event photo uploads.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // guests shouldn't accidentally pinch-zoom the upload UI mid-tap
  themeColor: "#0a0a0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-950 text-white antialiased min-h-screen">{children}</body>
    </html>
  );
}
