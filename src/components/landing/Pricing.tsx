"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const currencies = ["ZAR", "USD", "GBP", "EUR", "NGN"] as const;
type Currency = (typeof currencies)[number];
const prices: Record<Currency, [string, string, string]> = {
  ZAR: ["R0", "R59.99", "R149.99"], USD: ["$0", "$3.49", "$8.49"],
  GBP: ["£0", "£2.79", "£6.99"], EUR: ["€0", "€3.19", "€7.99"],
  NGN: ["₦0", "₦5,500", "₦13,800"],
};
const tiers = [
  { name: "Free", detail: ["10 downloads", "100 gallery photos", "10 photos per guest", "15 MB per file", "7-day retention"] },
  { name: "Party Pack", detail: ["100 downloads", "240 gallery photos", "20 photos per guest", "15 MB per file", "60-day retention"] },
  { name: "Event Pack", detail: ["500 downloads", "1,000 gallery photos", "30 photos per guest", "15 MB per file", "120-day retention"] },
];
export function Pricing() {
  const [currency, setCurrency] = useState<Currency>("ZAR");
  useEffect(() => { const saved = localStorage.getItem("shutamzala-currency"); if (currencies.includes(saved as Currency)) setCurrency(saved as Currency); }, []);
  function choose(value: Currency) { setCurrency(value); localStorage.setItem("shutamzala-currency", value); }
  return <section id="pricing" className="relative overflow-hidden py-20 lg:py-28"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <Reveal><SectionHeading eyebrow="Pricing" title="A plan for every celebration" description="Simple event pricing, with clear limits and no subscriptions." /></Reveal>
    <div className="my-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Choose pricing currency">{currencies.map(c => <button key={c} onClick={() => choose(c)} aria-pressed={currency === c} className={`rounded-full border px-4 py-2 text-sm font-semibold ${currency === c ? "border-violet-400 bg-violet-500 text-white" : "border-slate-700 bg-slate-900 text-slate-300"}`}>{c}</button>)}</div>
    <div className="grid gap-5 md:grid-cols-3">{tiers.map((tier, i) => <Reveal key={tier.name} delay={i * 70}><article className="h-full rounded-2xl border border-slate-700 bg-slate-900/80 p-7"><h3 className="text-xl font-bold text-white">{tier.name}</h3><p className="mt-5 text-4xl font-bold text-white">{prices[currency][i]}<span className="ml-2 text-sm font-normal text-slate-400">/ event</span></p><ul className="mt-7 space-y-4">{tier.detail.map(line => <li key={line} className="flex gap-3 text-sm text-slate-300"><Check className="h-4 w-4 text-emerald-400" />{line}</li>)}</ul><ButtonLink href="/signup" size="lg" className="mt-8 w-full">Get started <ArrowRight className="h-4 w-4" /></ButtonLink></article></Reveal>)}</div>
  </div></section>;
}
export default Pricing;
