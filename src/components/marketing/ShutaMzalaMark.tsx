import type { ImgHTMLAttributes } from "react";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height"> {
  /** Rendered size in pixels. 36 is the header/footer size. */
  size?: number;
}

/**
 * The shutaMzala app mark — layered photo cards with an asymmetric sparkle.
 * The raster asset is shared by the header, footer, favicon and social assets
 * so the product identity remains consistent at every size.
 *
 * Decorative by default: it always sits next to the "shutaMzala" wordmark, so
 * announcing it again would just repeat the name to a screen reader. Pass
 * `aria-hidden={false}` and a `role="img"` label where it stands alone.
 */
export function ShutaMzalaMark({ size = 36, className, ...props }: Props) {
  return (
    <img
      width={size}
      height={size}
      src="/brand/shutamzala-app-logo.png"
      alt=""
      aria-hidden="true"
      className={className}
      {...props}
    />
  );
}

export default ShutaMzalaMark;
