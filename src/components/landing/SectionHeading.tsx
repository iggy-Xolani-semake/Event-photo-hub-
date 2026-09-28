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
 * The shared rhythm for every section below the hero: a small uppercase
 * eyebrow, a tight tracking-tight headline, and one supporting line. Keeping it
 * in one component is what makes the page read as a single design rather than
 * seven separately-styled blocks.
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
      <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300">
        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
        {eyebrow}
      </span>

      <h2
        className={clsx(
          "max-w-2xl text-[2rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-slate-900 sm:text-[2.6rem] dark:text-white",
          centered && "mx-auto"
        )}
      >
        {title}
      </h2>

      {description && (
        <p
          className={clsx(
            "max-w-2xl text-base leading-relaxed text-slate-600 dark:text-white/55",
            centered && "mx-auto"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export default SectionHeading;
