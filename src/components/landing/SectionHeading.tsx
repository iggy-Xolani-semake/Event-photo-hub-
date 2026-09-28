import clsx from "clsx";
import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
}

/**
 * Shared rhythm for every landing section: micro-copy eyebrow, page-title-ramp
 * headline, one supporting line. One component keeps seven sections reading as
 * a single design.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={clsx(
        "flex flex-col gap-4",
        centered ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
        {eyebrow}
      </span>

      <h2
        className={clsx(
          "max-w-2xl text-3xl font-bold tracking-tight text-white md:text-4xl",
          centered && "mx-auto"
        )}
      >
        {title}
      </h2>

      {description && (
        <p
          className={clsx("max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base", centered && "mx-auto")}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export default SectionHeading;
