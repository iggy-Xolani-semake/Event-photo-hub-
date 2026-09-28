import { useId, type SVGProps } from "react";

interface MemoraLogoProps extends SVGProps<SVGSVGElement> {
  size?: "sm" | "md" | "lg";
}

const DIMENSIONS = { sm: 34, md: 40, lg: 48 } as const;

/**
 * Memora's core mark: layered memory cards with an M-shaped fold.
 *
 * Drawn as SVG rather than text so it stays crisp in the navigation, footer,
 * QR posters, and future app icons. The gradient id comes from useId() because
 * the mark appears more than once per page (header + footer) and duplicate SVG
 * ids would make both instances resolve to whichever came first.
 */
export function MemoraLogo({ size = "md", className, ...props }: MemoraLogoProps) {
  const gradientId = useId();
  const dimension = DIMENSIONS[size];

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
        <linearGradient id={gradientId} x1="7" y1="4" x2="34" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <rect
        x="5.5"
        y="4.5"
        width="27"
        height="27"
        rx="8.5"
        transform="rotate(-8 5.5 4.5)"
        fill={`url(#${gradientId})`}
        opacity="0.45"
      />
      <rect x="7.5" y="7.5" width="27" height="27" rx="8.5" fill={`url(#${gradientId})`} />
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
