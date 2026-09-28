import { ImageResponse } from "next/og";

export const alt = "Memora — collect every guest photo from your event";
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
        {/* brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            M
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>
            Memora
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
              R50 per event
            </div>
            <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.45)" }}>
              Free to create · memora.app
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
