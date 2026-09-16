"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  CreateEventIcon,
  ShareQrIcon,
  UploadPhotoIcon,
  ViewMemoriesIcon,
} from "@/components/marketing/StepIcons";

export default function HomePage() {
  const router = useRouter();
  const [eventCode, setEventCode] = useState("");
  const [error, setError] = useState("");

  function handleEventLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = eventCode.trim().toUpperCase();

    if (!cleaned) {
      setError("Enter an event code first.");
      return;
    }

    setError("");
    router.push(`/e/${cleaned}`);
  }

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.18),_transparent_35%)]" aria-hidden="true" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b0d]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-2xl tracking-tight text-[#f5d98b]">
            Event Photo Hub
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <Link href="#features" className="transition hover:text-white">
              Features
            </Link>
            <Link href="#how-it-works" className="transition hover:text-white">
              How it works
            </Link>
            <Link href="#pricing" className="transition hover:text-white">
              Pricing
            </Link>
            <Link href="#about" className="transition hover:text-white">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/admin/login" className="hidden rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:text-white sm:inline-flex">
              Sign in
            </Link>
            <Link href="/admin/login" className="rounded-full bg-[#d4af37] px-4 py-2 text-sm font-semibold text-[#111111] transition hover:bg-[#e2c55a]">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 md:pt-28">
        <div className="grid items-center gap-12 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-[#f0dca3]">
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Built for events
            </div>

            <h1 className="max-w-xl font-display text-5xl leading-none tracking-[-0.04em] text-white md:text-6xl">
              Never lose a moment from your event.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
              Guests upload instantly with one link. You keep the gallery organised, private,
              and ready to share in seconds.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/login"
                className="inline-flex items-center justify-center rounded-full bg-[#d4af37] px-6 py-3.5 text-sm font-semibold text-[#111111] transition hover:bg-[#e2c55a]"
              >
                Start hosting
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
              >
                See how it works
              </Link>
            </div>

            <form onSubmit={handleEventLookup} className="mt-8 max-w-md">
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
                Have an event code?
              </label>
              <div className="flex gap-2">
                <input
                  value={eventCode}
                  onChange={(e) => {
                    setEventCode(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter event code"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none ring-0 placeholder:text-white/30 focus:border-[#d4af37]"
                />
                <button
                  type="submit"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:border-white/25 hover:text-white"
                >
                  Open
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
            </form>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/10 bg-[#121215] p-4 shadow-2xl shadow-black/40">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#1a1a1f]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs text-white/60">
                  <span>Live event</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-300">128 photos</span>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <div className="overflow-hidden rounded-2xl bg-[#272730] p-3">
                    <div className="mb-2 h-32 rounded-xl bg-[radial-gradient(circle_at_top,_#f5d98b,_#8c6a1a_60%,_#1e1b14)]" />
                    <div className="space-y-2">
                      <div className="h-2.5 w-20 rounded-full bg-white/10" />
                      <div className="h-2.5 w-14 rounded-full bg-white/10" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-[#272730] p-3">
                      <div className="mb-2 h-20 rounded-xl bg-[linear-gradient(135deg,_rgba(212,175,55,0.35),_rgba(27,26,31,0.8))]" />
                    </div>
                    <div className="rounded-2xl bg-[#272730] p-3">
                      <div className="mb-2 flex gap-2">
                        <div className="h-12 w-12 rounded-xl bg-[#3a3a42]" />
                        <div className="h-12 w-12 rounded-xl bg-[#3a3a42]" />
                        <div className="h-12 w-12 rounded-xl bg-[#3a3a42]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-white/10 bg-[#0f0f12] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#f0dca3]">
              Why event hosts choose us
            </p>
            <h2 className="mt-4 font-display text-4xl text-white">
              One link. A full event gallery.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <FeatureCard
              icon={<CreateEventIcon />}
              title="Create an event"
              detail="Set up a name, date, and permissions in under a minute."
            />
            <FeatureCard
              icon={<ShareQrIcon />}
              title="Share the QR code"
              detail="Print it, send it, or display it at the venue with zero friction."
            />
            <FeatureCard
              icon={<UploadPhotoIcon />}
              title="Guests upload"
              detail="No sign-up, no app, no password. Photos land in one shared gallery."
            />
            <FeatureCard
              icon={<ViewMemoriesIcon />}
              title="Everyone views the memories"
              detail="Open the gallery later and download the best shots in seconds."
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#f0dca3]">
            Simple flow
          </p>
          <h2 className="mt-4 font-display text-4xl text-white">From QR scan to shared gallery</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <StepCard step="01" title="Create" detail="Set up your event and generate a dedicated QR code or guest link." />
          <StepCard step="02" title="Share" detail="Put it on a table, add it to your event poster, or send it directly." />
          <StepCard step="03" title="Collect" detail="Guests upload their photos instantly and the shared gallery updates live." />
        </div>
      </section>

      <section id="pricing" className="border-y border-white/10 bg-[#0f0f12] py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#f0dca3]">
            Pricing
          </p>
          <h2 className="mt-4 font-display text-4xl text-white">Built to keep events simple</h2>
          <p className="mx-auto mt-5 max-w-2xl text-white/65">
            Use the platform for your event, keep the memories organised, and give guests an
            easy way to contribute without friction.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <PricingCard title="Starter" price="Free" details="For personal events and simple guest collections." />
            <PricingCard title="Event" price="From $19" details="A practical plan for hosted celebrations and small gatherings." highlight />
            <PricingCard title="Pro" price="Custom" details="For larger events, extra uploads, and premium organisation features." />
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#f0dca3]">
              About Event Photo Hub
            </p>
            <h2 className="mt-4 font-display text-4xl text-white">The easiest way to collect event memories.</h2>
            <p className="mt-5 max-w-xl text-white/65 leading-relaxed">
              We built a no-fuss photo-sharing flow for weddings, birthdays, brand events, and
              other gatherings where the best moments come from guests, not the host.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <Stat value="1 link" label="to share" />
              <Stat value="100%" label="guest-friendly" />
              <Stat value="No app" label="required" />
              <Stat value="All in one" label="gallery" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#101014] p-4">
            <div className="overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,_#1b1b20,_#111216)] p-6">
              <div className="mb-4 h-48 rounded-[1.25rem] bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.38),_rgba(18,18,20,0.8)_58%)]" />
              <div className="space-y-3">
                <div className="h-3 w-24 rounded-full bg-white/10" />
                <div className="h-3 w-32 rounded-full bg-white/10" />
                <div className="h-3 w-full rounded-full bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-[2rem] border border-[#d4af37]/20 bg-[#d4af37]/10 p-8 text-center md:p-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#f0dca3]">
            Ready to go
          </p>
          <h2 className="mt-4 font-display text-4xl text-white">Start your next event collection.</h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/admin/login" className="inline-flex items-center justify-center rounded-full bg-[#d4af37] px-6 py-3.5 text-sm font-semibold text-[#111111]">
              Create event
            </Link>
            <Link href="/privacy" className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white">
              Privacy &amp; trust
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[#121215] p-6">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d4af37]/10 text-[#f0dca3]">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-white/60">{detail}</p>
    </div>
  );
}

function StepCard({ step, title, detail }: { step: string; title: string; detail: string }) {
  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-[#121215] p-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#f0dca3]">{step}</p>
      <h3 className="mt-4 text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/60">{detail}</p>
    </div>
  );
}

function PricingCard({
  title,
  price,
  details,
  highlight = false,
}: {
  title: string;
  price: string;
  details: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border p-6 ${
        highlight
          ? "border-[#d4af37]/40 bg-[#d4af37]/10"
          : "border-white/10 bg-[#121215]"
      }`}
    >
      <p className="text-sm uppercase tracking-[0.2em] text-white/50">{title}</p>
      <p className="mt-5 font-display text-4xl text-white">{price}</p>
      <p className="mt-4 text-sm leading-relaxed text-white/65">{details}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121215] p-4">
      <div className="font-display text-3xl text-[#f0dca3]">{value}</div>
      <div className="mt-2 text-xs uppercase tracking-[0.2em] text-white/45">{label}</div>
    </div>
  );
}
