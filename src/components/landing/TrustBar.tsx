import { ShieldCheck, SmartphoneNfc, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Reveal } from "./Reveal";

interface Metric {
  icon: ReactNode;
  value: string;
  label: string;
  detail: string;
}

const METRICS: Metric[] = [
  {
    icon: <SmartphoneNfc className="h-4 w-4" strokeWidth={2.3} />,
    value: "0",
    label: "Downloads Required",
    detail: "Guests upload straight from their mobile browser.",
  },
  {
    icon: <Zap className="h-4 w-4" strokeWidth={2.3} />,
    value: "< 5s",
    label: "Upload Time",
    detail: "Signed transfers go directly to Cloudflare R2.",
  },
  {
    icon: <ShieldCheck className="h-4 w-4" strokeWidth={2.3} />,
    value: "100%",
    label: "Privacy-Controlled",
    detail: "You set the visibility and the expiry date.",
  },
];

/**
 * The three objections a host has before signing up, answered as numbers
 * before they have to read a paragraph.
 */
export function TrustBar() {
  return (
    <section aria-label="Key metrics" className="relative py-4 lg:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <Card glass className="relative overflow-hidden p-0">
            <div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent"
              aria-hidden="true"
            />

            <dl className="grid divide-y divide-slate-800 md:grid-cols-3 md:divide-x md:divide-y-0">
              {METRICS.map((metric) => (
                <div
                  key={metric.label}
                  className="group flex items-start gap-4 px-6 py-7 transition-colors duration-300 hover:bg-slate-800/30 md:flex-col md:items-center md:px-5 md:text-center"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/30 transition group-hover:scale-105 md:mb-1">
                    {metric.icon}
                  </span>

                  <div className="min-w-0">
                    <dt className="sr-only">{metric.label}</dt>
                    <dd>
                      <span className="block text-3xl font-bold leading-none tracking-tight text-white tabular-nums">
                        {metric.value}
                      </span>
                      <span className="mt-2 block text-xs font-medium uppercase tracking-wider text-indigo-300">
                        {metric.label}
                      </span>
                      <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">
                        {metric.detail}
                      </span>
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

export default TrustBar;
