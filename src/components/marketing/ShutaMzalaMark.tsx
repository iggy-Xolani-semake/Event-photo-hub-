import Image from "next/image";

interface Props {
  /** Rendered size in pixels. 36 is the header/footer size. */
  size?: number;
  className?: string;
}

/** Decorative logo mark shown beside the shutaMzala wordmark. */
export function ShutaMzalaMark({ size = 36, className }: Props) {
  return (
    <Image
      src="/brand/shutamzala-shutter.png"
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      priority
    />
  );
}

export default ShutaMzalaMark;
