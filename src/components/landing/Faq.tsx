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
 * Client component: an accordion needs state. One panel open at a time (none
 * to start) keeps the section scannable. Heights animate with the
 * grid-template-rows 0fr→1fr trick so any answer length works, and collapsed
 * panels are visibility:hidden so hidden answers leave the accessibility tree.
 */
export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id="faq"
      className="relative border-y border-slate-800 bg-slate-900/30 py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                    "overflow-hidden rounded-2xl border bg-slate-900/50 shadow-xl transition-all duration-300",
                    isOpen ? "border-indigo-500/40" : "border-slate-800 hover:border-slate-700"
                  )}
                >
                  <h3>
                    <button
                      type="button"
                      id={headingId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                    >
                      <span
                        className={clsx(
                          "text-base font-semibold tracking-tight transition-colors",
                          isOpen ? "text-indigo-200" : "text-slate-100"
                        )}
                      >
                        {faq.question}
                      </span>

                      <span
                        className={clsx(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                          isOpen
                            ? "brand-gradient rotate-180 text-white shadow-lg shadow-indigo-500/25"
                            : "bg-slate-800/60 text-slate-400"
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
                      "grid transition-all duration-300 ease-out",
                      isOpen ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-6 text-sm leading-relaxed text-slate-400">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={140}>
          <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-slate-400">
            <LifeBuoy className="h-4 w-4 text-indigo-400" strokeWidth={2.3} />
            Still unsure? Create your event free — you only pay if you unlock the originals.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default Faq;
