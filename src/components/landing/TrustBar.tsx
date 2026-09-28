import { Reveal } from "./Reveal";
import { ShieldCheck, SmartphoneNfc, Zap } from "lucide-react";
import type { ReactNode } from "react";

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
 * The three objections a host actually has before signing up — "will my guests
 * have to install something?", "will it be slow on venue Wi-Fi?", "who can see
 * these photos?" — answered as numbers before they have to read a paragraph.
 */
export function TrustBar() {
  return (
    <section aria-label="Key metrics" className="relative py-4 lg:py-8">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-white/10 dark:bg-white/[0.03]">
            {/* hairline highlight across the top edge */}
            <div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"
              aria-hidden="true"
            />

            <dl className="grid divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0 dark:divide-white/[0.08]">
              {METRICS.map((metric) => (
                <div
                  key={metric.label}
                  className="group flex items-start gap-4 px-6 py-7 transition-colors duration-300 hover:bg-violet-50/50 md:flex-col md:items-center md:px-5 md:text-center dark:hover:bg-white/[0.03]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-violet-600 ring-1 ring-violet-100 transition group-hover:scale-105 group-hover:from-indigo-500 group-hover:to-violet-600 group-hover:text-white group-hover:ring-transparent md:mb-1 dark:from-violet-500/15 dark:to-indigo-500/10 dark:text-violet-300 dark:ring-white/10">
                    {metric.icon}
                  </span>

                  <div className="min-w-0">
                    <dt className="sr-only">{metric.label}</dt>
                    <dd>
                      <span className="block text-[2rem] font-extrabold leading-none tracking-[-0.045em] text-slate-900 tabular-nums dark:text-white">
                        {metric.value}
                      </span>
                      <span className="mt-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                        {metric.label}
                      </span>
                      <span className="mt-1.5 block text-xs leading-relaxed text-slate-500 dark:text-white/40">
                        {metric.detail}
                      </span>
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default TrustBar;
