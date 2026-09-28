import clsx from "clsx";

/**
 * A decorative QR glyph for the hero's phone mockup.
 *
 * Intentionally NOT a scannable code: a real one would encode a URL for an
 * event that does not exist, and a curious visitor who scans the hero image
 * would land on "event not found". If this ever needs to become real, render
 * the host's actual code with src/components/admin/EventQrCode.tsx instead of
 * swapping the pattern below.
 *
 * The module is built once at import time into a single SVG path (rather than
 * ~300 individual <rect> elements) so the mockup costs one DOM node.
 */

const SIZE = 25;

function moduleHash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return Math.abs(h ^ (h >>> 16));
}

function inFinderRegion(x: number, y: number): boolean {
  const right = x >= SIZE - 7;
  const bottom = y >= SIZE - 7;
  return (x < 7 && y < 7) || (right && y < 7) || (x < 7 && bottom);
}

function buildPath(): string {
  const parts: string[] = [];

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let filled: boolean;

      if (inFinderRegion(x, y)) {
        // Local coords inside whichever 7x7 finder square this module sits in.
        const lx = x < 7 ? x : x - (SIZE - 7);
        const ly = y < 7 ? y : y - (SIZE - 7);
        const isRing = lx === 0 || lx === 6 || ly === 0 || ly === 6;
        const isCore = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
        filled = isRing || isCore;
      } else if (x === 6 || y === 6) {
        filled = (x + y) % 2 === 0; // timing patterns
      } else {
        filled = moduleHash(x, y) % 100 < 46;
      }

      if (filled) parts.push(`M${x} ${y}h1v1h-1z`);
    }
  }

  return parts.join("");
}

const QR_PATH = buildPath();

export function QrGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`}
      className={clsx("h-full w-full", className)}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d={QR_PATH} fill="currentColor" />
    </svg>
  );
}

export default QrGlyph;
