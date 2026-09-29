import { useId, type SVGProps } from "react";

interface Props extends SVGProps<SVGSVGElement> {
  /** Rendered size in pixels. 36 is the header/footer size. */
  size?: number;
}

/**
 * The Memora mark — a sparkle caught mid-moment, with a glint beside it.
 *
 * Drawn on a 40×40 grid so it scales cleanly from the 16px browser tab to the
 * hero, and in the app's own brand gradient (#7C3AED → #6366F1 at 135°, the
 * same two stops as the `brand-gradient` utility in globals.css).
 *
 * The gradient id comes from `useId()` because the mark appears more than once
 * on a page (header and footer); duplicate SVG ids make every instance resolve
 * to whichever gradient painted first.
 *
 * Decorative by default: it always sits next to the "Memora" wordmark, so
 * announcing it again would just repeat the name to a screen reader. Pass
 * `aria-hidden={false}` and a `role="img"` label where it stands alone.
 */
export function MemoraMark({ size = 36, className, ...props }: Props) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      {...props}
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="5" y1="5" x2="35" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <rect x="4.5" y="4.5" width="31" height="31" rx="10" fill={`url(#${id})`} />
      <path
        d="M20 7.4c1.5 7.6 4.9 11 12.5 12.5-7.6 1.5-11 4.9-12.5 12.5-1.5-7.6-4.9-11-12.5-12.5C15.1 18.4 18.5 15 20 7.4Z"
        fill="white"
      />
      <circle cx="27.6" cy="28.4" r="1.7" fill="white" opacity="0.75" />
    </svg>
  );
}

export default MemoraMark;
