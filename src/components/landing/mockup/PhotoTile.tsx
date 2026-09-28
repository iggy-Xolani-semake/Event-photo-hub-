import clsx from "clsx";
import type { CSSProperties } from "react";

/**
 * A stylised stand-in for a guest photo, used inside the hero mockups.
 *
 * Deliberately not a real photograph: the hero must render instantly with zero
 * network requests (no layout shift, no broken tiles on a flaky venue
 * connection), and a decorative abstract tile reads as "product mockup" rather
 * than "stock photo". Every tile is derived from its seed with plain maths, so
 * the server and the client produce identical markup.
 */

const PALETTES: ReadonlyArray<readonly [string, string]> = [
  ["#fb923c", "#e11d48"],
  ["#a855f7", "#4f46e5"],
  ["#22d3ee", "#2563eb"],
  ["#34d399", "#0f766e"],
  ["#f472b6", "#7c3aed"],
  ["#facc15", "#ea580c"],
  ["#818cf8", "#1e1b4b"],
  ["#4ade80", "#0891b2"],
];

const FALLBACK_PALETTE: readonly [string, string] = ["#818cf8", "#7c3aed"];

/** Small deterministic PRNG so bokeh placement looks organic but never flickers. */
function makeRandom(seed: number) {
  let state = (seed + 1) * 1103515245;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

interface Bokeh {
  top: number;
  left: number;
  size: number;
  opacity: number;
}

function buildBokeh(seed: number): Bokeh[] {
  const random = makeRandom(seed);
  const count = 3 + Math.floor(random() * 2);
  return Array.from({ length: count }, () => ({
    top: 6 + random() * 62,
    left: 4 + random() * 74,
    size: 18 + random() * 46,
    opacity: 0.12 + random() * 0.28,
  }));
}

interface PhotoTileProps {
  seed: number;
  className?: string;
  style?: CSSProperties;
  /** Two dark figures at the bottom of the frame — reads as "people at a party". */
  silhouettes?: boolean;
  rounded?: string;
}

export function PhotoTile({
  seed,
  className,
  style,
  silhouettes = seed % 3 === 0,
  rounded = "rounded-lg",
}: PhotoTileProps) {
  const palette = PALETTES[seed % PALETTES.length] ?? FALLBACK_PALETTE;
  const bokeh = buildBokeh(seed);

  return (
    <div
      aria-hidden="true"
      className={clsx("relative overflow-hidden", rounded, className)}
      style={{
        backgroundImage: `linear-gradient(150deg, ${palette[0]} 0%, ${palette[1]} 100%)`,
        ...style,
      }}
    >
      {bokeh.map((dot, index) => (
        <span
          key={index}
          className="absolute rounded-full bg-white blur-[2px]"
          style={{
            top: `${dot.top}%`,
            left: `${dot.left}%`,
            width: `${dot.size}%`,
            aspectRatio: "1",
            opacity: dot.opacity,
          }}
        />
      ))}

      {silhouettes && (
        <>
          <span className="absolute -bottom-[18%] left-[12%] h-[46%] w-[42%] rounded-[50%] bg-slate-950/40" />
          <span className="absolute bottom-[26%] left-[22%] h-[26%] w-[22%] rounded-full bg-slate-950/40" />
          <span className="absolute -bottom-[18%] right-[10%] h-[40%] w-[38%] rounded-[50%] bg-slate-950/30" />
          <span className="absolute bottom-[22%] right-[20%] h-[22%] w-[20%] rounded-full bg-slate-950/30" />
        </>
      )}

      {/* Vignette + top sheen so the tiles look like photos, not flat colour chips. */}
      <span className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-white/10" />
    </div>
  );
}

export default PhotoTile;
