import type { SVGProps } from "react";

interface MemoraLogoProps extends SVGProps<SVGSVGElement> {
  size?: "sm" | "md";
}

/**
 * Memora's core mark: layered memory cards with an M-shaped fold.
 * It is intentionally drawn as SVG rather than text so it stays crisp in the
 * navigation, footer, QR posters, and future app icons.
 */
export function MemoraLogo({ size = "md", className, ...props }: MemoraLogoProps) {
  const dimension = size === "sm" ? 34 : 40;

  return (
    <svg
      aria-label="Memora logo"
      role="img"
      width={dimension}
      height={dimension}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="memora-logo-gradient" x1="7" y1="4" x2="34" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F27A3A" />
          <stop offset="1" stopColor="#C94C16" />
        </linearGradient>
      </defs>
      <rect x="5.5" y="4.5" width="27" height="27" rx="8.5" transform="rotate(-8 5.5 4.5)" fill="url(#memora-logo-gradient)" opacity="0.52" />
      <rect x="7.5" y="7.5" width="27" height="27" rx="8.5" fill="url(#memora-logo-gradient)" />
      <path
        d="M14 27V15.5L20.5 22l6.5-6.5V27"
        stroke="white"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M29.8 8.3v4.2M27.7 10.4h4.2" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

export default MemoraLogo;
