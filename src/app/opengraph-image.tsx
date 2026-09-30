import { ImageResponse } from "next/og";

export const alt = "shutaMzala — collect every guest photo from your event";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social preview card, generated at build time rather than shipped as a static
 * PNG: the headline here is the same one the landing page uses, so the two can
 * be edited in the same commit and never drift apart.
 *
 * Styling is inline objects only — this is rendered by Satori, not a browser,
 * so Tailwind classes, box-shadow and backdrop-filter are unavailable and every
 * container needs an explicit display:flex.
 */

const PHOTO_GRADIENTS = [
  "linear-gradient(150deg, #fb923c, #e11d48)",
  "linear-gradient(150deg, #a855f7, #4f46e5)",
  "linear-gradient(150deg, #22d3ee, #2563eb)",
  "linear-gradient(150deg, #34d399, #0f766e)",
  "linear-gradient(150deg, #f472b6, #7c3aed)",
  "linear-gradient(150deg, #facc15, #ea580c)",
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b0b13 0%, #191436 52%, #2b1055 100%)",
          padding: "70px 80px",
          color: "#ffffff",
        }}
      >
        {/* brand row — the real mark, drawn as an inline SVG so the social card
            cannot drift from the app. Satori renders SVG children directly, so
            no extra font or image fetch is involved. */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 40 40">
            <defs>
              <linearGradient id="brand" x1="5" y1="5" x2="35" y2="35" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7C3AED" />
                <stop offset="1" stopColor="#6366F1" />
              </linearGradient>
            </defs>
            <rect x="4.5" y="4.5" width="31" height="31" rx="10" fill="url(#brand)" />
            <path
              d="M20 7.4c1.5 7.6 4.9 11 12.5 12.5-7.6 1.5-11 4.9-12.5 12.5-1.5-7.6-4.9-11-12.5-12.5C15.1 18.4 18.5 15 20 7.4Z"
              fill="#fff"
            />
            <circle cx="27.6" cy="28.4" r="1.7" fill="#fff" opacity="0.75" />
          </svg>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>
            shutaMzala
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: 8,
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
              fontSize: 17,
              fontWeight: 600,
              color: "#ddd6fe",
            }}
          >
            One QR code · every guest photo
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: -3,
              width: 800,
            }}
          >
            Collect every guest photo from your event
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 27,
              lineHeight: 1.45,
              color: "rgba(255,255,255,0.62)",
              width: 720,
            }}
          >
            No app downloads. No guest sign-ups. Full-resolution originals, unlocked as one ZIP.
          </div>
        </div>

        {/* footer: gallery grid + price */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
            {PHOTO_GRADIENTS.map((gradient, index) => (
              <div
                key={index}
                style={{
                  width: index === 0 ? 88 : 68,
                  height: index === 0 ? 88 : 68,
                  borderRadius: 14,
                  background: gradient,
                  border: "2px solid rgba(255,255,255,0.22)",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 26px",
                borderRadius: 16,
                background: "linear-gradient(115deg, #4f46e5, #a855f7)",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              Plans from Free
            </div>
            <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.45)" }}>
              Free to create · shutaMzala.app
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
