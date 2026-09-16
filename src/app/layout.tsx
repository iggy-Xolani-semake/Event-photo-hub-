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
  themeColor: "#f5f1ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f5f1ee] text-[#1d1d20] antialiased">{children}</body>
    </html>
  );
}
