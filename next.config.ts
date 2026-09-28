import type { NextConfig } from "next";

const r2PublicHost = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Landing-page demo photography ships as local WebP in
    // public/images/demo (see src/components/landing/mockup/demoPhotos.ts),
    // so nothing here is needed to render it. images.unsplash.com is allowed
    // so the same tiles can be pointed at Unsplash URLs (Option A) by editing
    // that manifest alone — no config change, no hotlink 404s to chase.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(r2PublicHost ? [{ protocol: "https" as const, hostname: r2PublicHost }] : []),
    ],
  },
  // Guests on mobile hand-held cameras produce large payloads; the actual
  // enforcement of the 15MB / 10-file limits happens server-side in the
  // signed-upload route AND in Supabase Storage policies. This is just
  // headroom for the API route that talks to Supabase/R2.
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
