import { useId, type SVGProps } from "react";

/**
 * Three candidate brand marks for Memora, built as real SVG so they can be
 * judged at the size they will actually be seen (36px in the header) rather
 * than as a poster mockup.
 *
 * Shared constraints, taken from the existing design system:
 *   - canvas #090D16, brand gradient #7C3AED → #6366F1 (violet → indigo);
 *   - a 40×40 viewBox so every mark drops into the 36–40px tile the header and
 *     footer already use;
 *   - one accent colour (white) on the gradient, so nothing fights the UI;
 *   - drawn as paths, not text, so they survive at favicon scale.
 *
 * The gradient id comes from useId() because a page can render the same mark
 * twice (header + footer), and duplicate SVG ids make both resolve to whichever
 * instance painted first.
 */

export type BrandOptionId = "aperture" | "spark" | "frames";

interface MarkProps extends SVGProps<SVGSVGElement> {
  /** Rendered size in pixels. 36 and 40 are the two the app actually uses. */
  size?: number;
}

function Svg({ size = 40, children, ...props }: MarkProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Shared gradient definition; `id` is supplied by the caller's useId(). */
function BrandGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="5" y1="5" x2="35" y2="35" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7C3AED" />
        <stop offset="1" stopColor="#6366F1" />
      </linearGradient>
    </defs>
  );
}

/** The rounded-square tile every mark sits on. */
function Tile({ fill }: { fill: string }) {
  return <rect x="4.5" y="4.5" width="31" height="31" rx="10" fill={fill} />;
}

/* -------------------------------------------------------------------------- */
/* 1. Aperture M — the camera reads first                                     */
/* -------------------------------------------------------------------------- */

/**
 * A lens: white iris with a thin outer ring, and the M cut through it in the
 * brand gradient, so the letter looks like light coming through the aperture.
 * Photography is the product, so this is the most literal of the three.
 */
export function ApertureM({ size = 40, className, ...props }: MarkProps) {
  const id = useId();
  return (
    <Svg size={size} className={className} aria-label="Memora aperture mark" {...props}>
      <BrandGradient id={id} />
      <Tile fill={`url(#${id})`} />
      {/* Thin barrel, then a clear gap of gradient, then the iris. A heavy ring
          reads as a target or a vinyl record — the gap is what makes it a lens. */}
      <circle cx="20" cy="20" r="12.6" stroke="white" strokeWidth="0.8" opacity="0.55" />
      <circle cx="20" cy="20" r="9.2" fill="white" />
      <path
        d="M15.6 23.6V16.4L20 20.8l4.4-4.4v7.2"
        stroke={`url(#${id})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Moment spark — the feeling reads first                                  */
/* -------------------------------------------------------------------------- */

/**
 * A four-point sparkle (the "moment caught") with a small companion glint.
 * Softer and more premium than a camera glyph, and the only one of the three
 * whose silhouette is unmistakable at 16px.
 */
export function MomentSpark({ size = 40, className, ...props }: MarkProps) {
  const id = useId();
  return (
    <Svg size={size} className={className} aria-label="Memora spark mark" {...props}>
      <BrandGradient id={id} />
      <Tile fill={`url(#${id})`} />
      <path
        d="M20 7.4c1.5 7.6 4.9 11 12.5 12.5-7.6 1.5-11 4.9-12.5 12.5-1.5-7.6-4.9-11-12.5-12.5C15.1 18.4 18.5 15 20 7.4Z"
        fill="white"
      />
      <circle cx="27.6" cy="28.4" r="1.7" fill="white" opacity="0.75" />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Collected frames — the product reads first                              */
/* -------------------------------------------------------------------------- */

/**
 * Three stacked frames: the host's gallery filling up with guest photos. The
 * front card carries a lens dot in the gradient, so the stack still reads as
 * photography rather than as generic "cards".
 */
export function CollectedFrames({ size = 40, className, ...props }: MarkProps) {
  const id = useId();
  return (
    <Svg size={size} className={className} aria-label="Memora collected frames mark" {...props}>
      <BrandGradient id={id} />
      <Tile fill={`url(#${id})`} />
      {/* Upright, offset cards — a rotated stack turns to mush at 16px. Two
          quiet cards behind, one solid photo card in front carrying the lens. */}
      <rect x="8.8" y="13.4" width="14.6" height="14.6" rx="4.4" fill="white" opacity="0.3" />
      <rect x="11.6" y="11.4" width="15.4" height="15.4" rx="4.6" fill="white" opacity="0.55" />
      <rect x="14.6" y="9.6" width="16.8" height="16.8" rx="4.8" fill="white" />
      <circle cx="23" cy="18" r="3.2" fill={`url(#${id})`} />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */

export const BRAND_MARKS: Record<BrandOptionId, (props: MarkProps) => React.ReactElement> = {
  aperture: ApertureM,
  spark: MomentSpark,
  frames: CollectedFrames,
};

export interface BrandOption {
  id: BrandOptionId;
  name: string;
  /** What it says, in the terms the rest of the product uses. */
  idea: string;
  /** Where it wins, honestly — every option has a weakness. */
  note: string;
}

export const BRAND_OPTIONS: BrandOption[] = [
  {
    id: "aperture",
    name: "Aperture M",
    idea: "A lens iris with the M cut through it — the photo, and the name.",
    note: "Most literal about photography. Busiest of the three at 16px (favicon, browser tab).",
  },
  {
    id: "spark",
    name: "Moment spark",
    idea: "A sparkle: the moment caught, with a small glint beside it.",
    note: "Cleanest silhouette at any size and the friendliest. Says “moment”, not “camera”.",
  },
  {
    id: "frames",
    name: "Collected frames",
    idea: "Guest photos stacking up in the host's gallery.",
    note: "Explains the product instead of the trade. The stack is the least distinctive at favicon size.",
  },
];

export function BrandMark({ id, ...props }: { id: BrandOptionId } & MarkProps) {
  const Mark = BRAND_MARKS[id];
  return <Mark {...props} />;
}
