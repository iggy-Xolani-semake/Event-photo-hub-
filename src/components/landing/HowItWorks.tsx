import { Check, Download, Printer, ScanLine } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

interface Step {
  number: string;
  icon: ReactNode;
  title: string;
  body: string;
  points: string[];
}

const STEPS: Step[] = [
  {
    number: "01",
    icon: <Printer className="h-5 w-5" strokeWidth={2.2} />,
    title: "Create & Print",
    body: "Set up your event in seconds, then generate printable QR posters and a custom link you can drop into a WhatsApp group or an invite.",
    points: ["Printable QR posters", "Custom share link"],
  },
  {
    number: "02",
    icon: <ScanLine className="h-5 w-5" strokeWidth={2.2} />,
    title: "Guests Snap & Scan",
    body: "Guests point their camera at the code and upload straight from the browser. No app store download, no email registration, no password to forget.",
    points: ["Works in any browser", "Camera or camera roll"],
  },
  {
    number: "03",
    icon: <Download className="h-5 w-5" strokeWidth={2.2} />,
    title: "Collect & Download",
    body: "Watch the gallery populate live while the event is still on. Browse fast WebP previews, then unlock the untouched originals as a single ZIP.",
    points: ["Live gallery updates", "Original high-res ZIP"],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title={
              <>
                Three steps from empty room
                <br className="hidden sm:block" /> to full gallery
              </>
            }
            description="Nothing for your guests to learn and nothing for you to chase. The whole flow takes one QR code and about two minutes of setup."
          />
        </Reveal>

        <div className="relative mt-14 grid gap-6 lg:mt-16 lg:grid-cols-3 lg:gap-7">
          {/* connector line, visible only in the gutters between cards */}
          <div
            className="pointer-events-none absolute inset-x-[12%] top-[58px] hidden lg:block"
            aria-hidden="true"
          >
            <div className="h-px w-full bg-[repeating-linear-gradient(to_right,rgba(139,92,246,0.55)_0_8px,transparent_8px_16px)]" />
          </div>

          {STEPS.map((step, index) => (
            <Reveal key={step.number} delay={index * 110} className="relative z-10">
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-card transition duration-300 hover:-translate-y-1.5 hover:border-violet-300 hover:shadow-card-lg dark:border-white/10 dark:bg-ink-900 dark:hover:border-violet-400/40">
                {/* corner sheen on hover */}
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />

                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-glow transition duration-300 group-hover:scale-105">
                    {step.icon}
                  </span>
                  <span className="font-display text-[2.6rem] font-bold leading-none tracking-tight text-slate-900/[0.08] transition-colors duration-300 group-hover:text-violet-500/20 dark:text-white/[0.07] dark:group-hover:text-violet-300/20">
                    {step.number}
                  </span>
                </div>

                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
                  Step {index + 1}
                </p>
                <h3 className="mt-1.5 text-xl font-bold tracking-[-0.025em] text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-white/55">
                  {step.body}
                </p>

                <ul className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-white/[0.07]">
                  {step.points.map((point) => (
                    <li
                      key={point}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/70 transition group-hover:bg-violet-50 group-hover:text-violet-700 group-hover:ring-violet-200/70 dark:bg-white/[0.04] dark:text-white/55 dark:ring-white/10 dark:group-hover:bg-violet-500/10 dark:group-hover:text-violet-200"
                    >
                      <Check className="h-3 w-3 text-violet-500" strokeWidth={3} />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
