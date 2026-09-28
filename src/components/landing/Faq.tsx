"use client";

import clsx from "clsx";
import { ChevronDown, LifeBuoy } from "lucide-react";
import { useState } from "react";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const FAQS = [
  {
    question: "Do my guests need to create an account?",
    answer:
      "No. Guests scan the QR code and upload directly from their mobile browser — no app store download, no email registration and no password. Their session is held in an HttpOnly cookie, so nothing sensitive is reachable from the page's JavaScript.",
  },
  {
    question: "How do original file downloads work?",
    answer:
      "Preview thumbnails are free to view: the gallery shows fast WebP renditions that load instantly, even on venue Wi-Fi. The untouched high-resolution originals stay in object storage and unlock as a single ZIP download once the host pass is active for that event.",
  },
  {
    question: "How long are photos stored?",
    answer:
      "Uploads stay open for 7 days after the event, so guests who get home late can still add theirs. The gallery itself stays accessible for 30 days, which is comfortably longer than it takes to choose the shots you want to keep.",
  },
] as const;

/**
 * Client component: an accordion needs state. Only one panel is open at a time
 * (and none to start) so the section stays scannable — three expanded answers
 * would be a wall of text, which is what people are trying to avoid by reading
 * an FAQ in the first place.
 *
 * Heights animate with the grid-template-rows 0fr→1fr trick rather than a
 * hardcoded max-height, so it works for any answer length without clipping.
 */
export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id="faq"
      className="relative border-y border-slate-200/70 bg-slate-50/70 py-20 lg:py-28 dark:border-white/[0.07] dark:bg-white/[0.015]"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="FAQ"
            title="The questions hosts ask first"
            description="Short answers to the three things that usually decide it."
          />
        </Reveal>

        <Reveal delay={90} className="mt-12 lg:mt-14">
          <div className="mx-auto max-w-3xl space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openIndex === index;
              const headingId = `faq-heading-${index}`;
              const panelId = `faq-panel-${index}`;

              return (
                <div
                  key={faq.question}
                  className={clsx(
                    "overflow-hidden rounded-2xl border bg-white transition-all duration-300 dark:bg-ink-900",
                    isOpen
                      ? "border-violet-300 shadow-card-lg dark:border-violet-400/40"
                      : "border-slate-200 shadow-sm hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
                  )}
                >
                  <h3>
                    <button
                      type="button"
                      id={headingId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 sm:px-7"
                    >
                      <span
                        className={clsx(
                          "text-[15px] font-bold tracking-[-0.015em] transition-colors sm:text-base",
                          isOpen
                            ? "text-violet-700 dark:text-violet-200"
                            : "text-slate-900 dark:text-white"
                        )}
                      >
                        {faq.question}
                      </span>

                      <span
                        className={clsx(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                          isOpen
                            ? "brand-gradient rotate-180 text-white shadow-glow"
                            : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-white/50"
                        )}
                      >
                        <ChevronDown className="h-4 w-4" strokeWidth={2.6} />
                      </span>
                    </button>
                  </h3>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headingId}
                    className={clsx(
                      // Collapsed panels are visibility:hidden so their answers
                      // leave the accessibility tree instead of being read out
                      // while the button still says "collapsed".
                      "grid transition-all duration-300 ease-out",
                      isOpen
                        ? "visible grid-rows-[1fr] opacity-100"
                        : "invisible grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-6 text-sm leading-relaxed text-slate-600 sm:px-7 dark:text-white/55">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={140}>
          <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-slate-500 dark:text-white/45">
            <LifeBuoy className="h-4 w-4 text-violet-500" strokeWidth={2.3} />
            Still unsure? Create your event free — you only pay if you unlock the originals.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default Faq;
