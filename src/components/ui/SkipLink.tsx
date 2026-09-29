import clsx from "clsx";

/**
 * Keyboard escape hatch: the first focusable thing on the page, invisible until
 * it is focused, which jumps focus past the header into the page content.
 *
 * Only useful if the target actually exists and is focusable, so every page
 * that renders this must give its main region `id={targetId}` and
 * `tabIndex={-1}` — otherwise the browser moves focus to the top of the
 * document and the link does nothing.
 */
export function SkipLink({
  targetId = "main",
  label = "Skip to content",
  className,
}: {
  targetId?: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={`#${targetId}`}
      className={clsx(
        "sr-only z-[90] rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white",
        "focus:not-sr-only focus:fixed focus:left-4 focus:top-4",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "print:hidden",
        className
      )}
    >
      {label}
    </a>
  );
}

export default SkipLink;
