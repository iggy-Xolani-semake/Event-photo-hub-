"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { parseEventCodeOrLink } from "@/lib/eventCode";

/**
 * "I already have a code" escape hatch for guests who were sent a link instead
 * of scanning a poster.
 *
 * Collapsed by default so it never competes with the two primary hero CTAs —
 * the hero's job is conversion, and this serves the small minority who arrive
 * with a code in hand. Parsing lives in src/lib/eventCode.ts so the landing
 * page can't accept input that /e/[code] would then reject.
 */
export function GalleryLookup() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = parseEventCodeOrLink(value);

    if (!code) {
      setError("That doesn't look like a Memora code or event link. Check it and try again.");
      return;
    }

    setError(null);
    router.push(`/e/${code}`);
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-md">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="gallery-lookup"
        className="group mx-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-white/45 dark:hover:text-white"
      >
        Already have an event code?
        <span className="underline decoration-slate-300 underline-offset-4 group-hover:decoration-violet-400 dark:decoration-white/25">
          Open a gallery
        </span>
        <ChevronDown
          className={clsx("h-3.5 w-3.5 transition-transform duration-300", open && "rotate-180")}
          strokeWidth={2.5}
        />
      </button>

      <div
        id="gallery-lookup"
        className={clsx(
          // `invisible` while collapsed: without it the input and buttons stay in
          // the tab order and readable by screen readers even at zero height.
          // visibility flips at the start of the expand and the end of the
          // collapse, so the height animation still plays in both directions.
          "grid transition-all duration-300 ease-out",
          open ? "visible mt-3 grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-violet-400/60">
              <Search
                className="ml-2 h-4 w-4 shrink-0 text-slate-400 dark:text-white/35"
                strokeWidth={2.4}
              />
              <input
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  if (error) setError(null);
                }}
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste a link or enter AMR8THBQ"
                aria-label="Event code or gallery link"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "gallery-lookup-error" : undefined}
                className="min-w-0 flex-1 border-none bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/30"
              />
              <button
                type="submit"
                className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-white/85"
              >
                Open
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>

            {error ? (
              <p
                id="gallery-lookup-error"
                role="alert"
                className="mt-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400"
              >
                {error}
              </p>
            ) : (
              <p className="mt-2 text-left text-xs text-slate-400 dark:text-white/35">
                Guests never need an account. Trouble opening it?{" "}
                <Link
                  href="/login"
                  className="font-medium text-violet-600 underline-offset-2 hover:underline dark:text-violet-300"
                >
                  Ask your host
                </Link>
                .
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default GalleryLookup;
