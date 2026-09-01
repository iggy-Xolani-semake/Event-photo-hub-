import type { NextConfig } from "next";

const r2PublicHost = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: r2PublicHost
      ? [
          {
            protocol: "https",
            hostname: r2PublicHost,
          },
        ]
      : [],
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
