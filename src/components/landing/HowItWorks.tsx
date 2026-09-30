import { Check, Download, Printer, ScanLine } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
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
    title: "Create & Share in Seconds",
    body: "Set up your event in seconds. Print a custom QR code poster for your tables, or copy your direct event link to drop straight into a WhatsApp group, SMS, or digital invite.",
    points: ["Printable QR Posters", "Direct WhatsApp & Web Link"],
  },
  {
    number: "02",
    icon: <ScanLine className="h-5 w-5" strokeWidth={2.2} />,
    title: "Guests Scan or Click to Upload",
    body: "Guests simply point their phone camera at the QR code or tap the link in your WhatsApp message. No app to download, no account sign-up required.",
    points: ["Works on any smartphone browser", "Direct camera & gallery upload"],
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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

        <div className="relative mt-14 grid gap-6 lg:mt-16 lg:grid-cols-3">
          <div
            className="pointer-events-none absolute inset-x-[12%] top-[58px] hidden lg:block"
            aria-hidden="true"
          >
            <div className="h-px w-full bg-[repeating-linear-gradient(to_right,rgba(99,102,241,0.5)_0_8px,transparent_8px_16px)]" />
          </div>

          {STEPS.map((step, index) => (
            <Reveal key={step.number} delay={index * 110} className="relative z-10">
              <Card className="group relative flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:border-indigo-500/40">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />

                <div className="flex items-start justify-between gap-4">
                  <span className="brand-gradient flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg shadow-indigo-500/20 transition duration-300 group-hover:scale-105">
                    {step.icon}
                  </span>
                  <span className="text-4xl font-bold leading-none tracking-tight text-slate-800 transition-colors duration-300 group-hover:text-indigo-500/40">
                    {step.number}
                  </span>
                </div>

                <p className="mt-6 text-xs font-medium uppercase tracking-wider text-indigo-300">
                  Step {index + 1}
                </p>
                <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.body}</p>

                <ul className="mt-6 flex flex-wrap gap-2 border-t border-slate-800 pt-5">
                  {step.points.map((point) => (
                    <li
                      key={point}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/50 px-2.5 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-slate-700/60 transition group-hover:text-indigo-200 group-hover:ring-indigo-500/30"
                    >
                      <Check className="h-3 w-3 text-violet-600" strokeWidth={3} />
                      {point}
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
