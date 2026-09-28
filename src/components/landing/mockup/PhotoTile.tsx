"use client";

import clsx from "clsx";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { DemoPhoto } from "./demoPhotos";

/**
 * One photo tile inside the hero mockups and the feature cards.
 *
 * It renders a real event photograph through next/image (`fill` + `object-cover`,
 * so it scales cleanly inside a rounded card or a phone screen frame) with two
 * overlays on top:
 *
 *   - `bg-black/20`, a flat scrim that keeps white text, hover badges and the
 *     favourite heart readable no matter how bright the photo underneath is;
 *   - a bottom-up gradient, which does the rest of the work where text sits.
 *
 * Optimization stays on: next/image picks a width from `sizes`, serves WebP,
 * and (because the files are local) never has to reach a third-party host.
 */

interface PhotoTileProps {
  photo: DemoPhoto;
  className?: string;
  style?: CSSProperties;
  /** Tailwind rounding classes; matches the container it sits in. */
  rounded?: string;
  /**
   * Text alternative. Leave it undefined for the decorative tiles inside the
   * mockups (the phone is already `aria-hidden`, the gallery is illustration)
   * and pass real alt text where the photo carries meaning, e.g. feature cards.
   */
  alt?: string;
  /** Layout hint for the srcset; always give the real rendered width. */
  sizes?: string;
  /** Preload this tile — only worth it for the first few above the fold. */
  priority?: boolean;
}

export function PhotoTile({
  photo,
  className,
  style,
  rounded = "rounded-lg",
  alt = "",
  sizes = "(min-width: 1024px) 140px, 30vw",
  priority = false,
}: PhotoTileProps) {
  return (
    <div
      aria-hidden={alt ? undefined : "true"}
      className={clsx("relative overflow-hidden bg-slate-800/60", rounded, className)}
      style={style}
    >
      <Image
        src={photo.src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        placeholder="blur"
        blurDataURL={photo.blurDataURL || undefined}
        className="object-cover"
        style={{
          objectPosition: photo.position,
          transform: photo.flip ? "scaleX(-1)" : undefined,
        }}
      />

      {/* Readability scrim over every photo: flat darkening for badges and
          hearts, gradient for the captions that sit at the bottom. */}
      <span className="pointer-events-none absolute inset-0 bg-black/20" aria-hidden="true" />
      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/5 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

export default PhotoTile;
