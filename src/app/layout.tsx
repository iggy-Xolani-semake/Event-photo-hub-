import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "shutaMzala",
  description: "shutaMzala — collect, share, and relive the moments that matter.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // guests shouldn't accidentally pinch-zoom the upload UI mid-tap
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="light-theme min-h-screen bg-canvas font-sans text-slate-700 antialiased">
        {children}
      </body>
    </html>
  );
}
