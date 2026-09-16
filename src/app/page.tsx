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

const eventImages = [
  "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
];

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
    <main className="min-h-screen bg-[#f5f1ee] text-[#1c1b1d]">
      <header className="sticky top-0 z-50 border-b border-[#2a221d]/10 bg-[#f5f1ee]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f27a3a] text-xs font-bold text-white shadow-sm">
              EP
            </span>
            <span className="text-[1.1rem] font-black tracking-[-0.04em] text-[#1d1d20]">
              Event Photo Hub
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#1d1d20]/75 md:flex">
            <Link href="/" className="border-b-2 border-[#f27a3a] pb-1 text-[#1d1d20]">
              Home
            </Link>
            <Link href="#features" className="transition hover:text-[#1d1d20]">
              Events
            </Link>
            <Link href="#pricing" className="transition hover:text-[#1d1d20]">
              Pricing
            </Link>
            <Link href="#about" className="transition hover:text-[#1d1d20]">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button type="button" aria-label="Theme toggle" className="hidden rounded-full border border-[#1d1d20]/10 bg-white/60 p-2 text-[#1d1d20] md:inline-flex">
              ☼
            </button>
            <Link href="/admin/login" className="rounded-full border border-[#1d1d20]/10 bg-[#f5f1ee] px-4 py-2 text-sm font-semibold text-[#1d1d20] shadow-sm transition hover:bg-white">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1200px] px-6 pb-16 pt-12 md:pb-20 md:pt-16">
        <div className="grid items-center gap-12 md:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f27a3a]/25 bg-[#fef1e6] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f27a3a]">
              Capture • Share • Relive
            </div>

            <h1 className="max-w-xl font-display text-5xl leading-[0.94] tracking-[-0.06em] text-[#1d1d20] md:text-[5.1rem]">
              Your Event <span className="text-[#f27a3a]">Photos, All in One</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#3a3632]">
              Event Photo Hub makes it easy to capture, share and access all the photos from your
              special moments. Simply enter your event code and relive the memories.
            </p>

            <form onSubmit={handleEventLookup} className="mt-8 max-w-[440px]">
              <div className="flex items-center gap-2 rounded-full border border-[#1d1d20]/15 bg-white/80 p-2 shadow-sm shadow-[#1d1d20]/5">
                <span className="ml-2 text-lg text-[#1d1d20]/65">⌕</span>
                <input
                  value={eventCode}
                  onChange={(e) => {
                    setEventCode(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter event code..."
                  className="w-full border-none bg-transparent px-2 py-2 text-base text-[#1d1d20] outline-none placeholder:text-[#1d1d20]/45"
                />
                <button
                  type="submit"
                  className="rounded-full bg-[#f27a3a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86f30]"
                >
                  →
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            </form>

            <div className="mt-8 grid max-w-[420px] gap-3 sm:grid-cols-4">
              <FeaturePill icon="⚡" label="Instant Access" />
              <FeaturePill icon="🔒" label="Secure & Private" />
              <FeaturePill icon="📷" label="Share with Everyone" />
              <FeaturePill icon="✨" label="Simple" />
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="absolute -right-6 top-4 h-20 w-20 rotate-12 rounded-full border border-[#f27a3a]/30 bg-[#f8e0d1]" aria-hidden="true" />
            <div className="relative flex items-end gap-4">
              <div className="relative ml-8 h-[420px] w-[220px] rounded-[32px] border-[12px] border-[#1e1d1f] bg-[#f7f0ea] p-3 shadow-[0_24px_46px_rgba(17,17,17,0.18)]">
                <div className="flex h-full flex-col overflow-hidden rounded-[20px] bg-[#f7f0ea]">
                  <div className="flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-[#1d1d20]/60">
                    <span>9:41</span>
                    <span>◉</span>
                  </div>
                  <div className="px-3 pb-3">
                    <div className="mb-3 flex items-center justify-between rounded-full border border-[#1d1d20]/10 bg-white px-2 py-1.5 text-[9px] font-medium text-[#1d1d20]/75">
                      <span>Event Photos</span>
                      <span className="rounded-full bg-[#f27a3a] px-1.5 py-0.5 text-white">Live</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {eventImages.map((src, index) => (
                        <div
                          key={src}
                          className="h-20 overflow-hidden rounded-xl border border-[#1d1d20]/10 bg-cover bg-center"
                          style={{ backgroundImage: `url(${src})`, opacity: index === 2 ? 0.85 : 1 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative bottom-0 h-[220px] w-[160px] overflow-hidden rounded-[24px] border border-[#1d1d20]/10 bg-[#f7f0ea] shadow-[0_16px_35px_rgba(17,17,17,0.14)]">
                <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80)" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1200px] px-6 py-8 md:py-12">
        <div className="grid gap-6 md:grid-cols-4">
          <FeatureCard icon={<CreateEventIcon />} title="Easy to Use" detail="Just enter your event code and start uploading photos." />
          <FeatureCard icon={<ShareQrIcon />} title="Share the Moments" detail="View, download and share with friends and family." />
          <FeatureCard icon={<UploadPhotoIcon />} title="Safe & Secure" detail="Your photos are protected and always private." />
          <FeatureCard icon={<ViewMemoriesIcon />} title="Instant Access" detail="Get your event photos right away without hassle." />
        </div>
      </section>

      <section id="events" className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f27a3a]">
              Featured Events
            </p>
            <h2 className="mt-3 font-display text-4xl tracking-[-0.05em] text-[#1d1d20]">
              Explore Our Events
            </h2>
          </div>
          <Link href="#" className="rounded-full border border-[#1d1d20]/10 bg-white px-4 py-2 text-sm font-semibold text-[#1d1d20] shadow-sm transition hover:bg-[#fffaf7]">
            View All Events →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <EventCard
            date="24 Aug 2025"
            title="Thabo & Lerato's Wedding"
            subtitle="Beautiful moments, forever."
            image="https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80"
          />
          <EventCard
            date="16 Aug 2025"
            title="Zinhle's 25th Birthday"
            subtitle="Good vibes, great people."
            image="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80"
          />
          <EventCard
            date="02 Aug 2025"
            title="NSX Inc. Corporate Event"
            subtitle="Networking, growth, success."
            image="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80"
          />
        </div>
      </section>

      <section id="pricing" className="bg-[#f1e8e2] py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f27a3a]">
                Pricing
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-[-0.05em] text-[#1d1d20]">
                Simple &amp; Flexible Pricing
              </h2>
              <p className="mt-3 max-w-md text-base leading-relaxed text-[#3a3632]">
                Choose the plan that fits your event needs. No hidden fees.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <PricingCard title="Basic" price="R99" suffix="/event" list={["Access to photos", "Download up to 50", "7 day access"]} />
              <PricingCard title="Standard" price="R199" suffix="/event" list={["Access to photos", "Download up to 200", "30 day access"]} highlight />
              <PricingCard title="Premium" price="R399" suffix="/event" list={["Access to photos", "Download unlimited", "Lifetime access"]} />
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1fr_0.9fr] md:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f27a3a]">
              About Us
            </p>
            <h2 className="mt-3 font-display text-4xl tracking-[-0.05em] text-[#1d1d20]">
              We&apos;re Event Photo Hub
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-[#3a3632]">
              We believe every moment matters. Event Photo Hub was created to help event organizers,
              guests and families easily capture and share the best moments from their special occasions.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              <StatValue value="100+" label="Events Hosted" />
              <StatValue value="50K+" label="Photos Shared" />
              <StatValue value="100%" label="Happy Clients" />
            </div>
          </div>

          <div className="relative flex min-h-[260px] items-center justify-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-44 w-32 overflow-hidden rounded-[20px] bg-cover bg-center shadow-[0_16px_30px_rgba(17,17,17,0.12)]" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80)" }} />
              <div className="h-44 w-32 overflow-hidden rounded-[20px] bg-cover bg-center shadow-[0_16px_30px_rgba(17,17,17,0.12)]" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=900&q=80)" }} />
              <div className="h-44 w-32 overflow-hidden rounded-[20px] bg-cover bg-center shadow-[0_16px_30px_rgba(17,17,17,0.12)]" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80)" }} />
              <div className="relative flex h-44 w-32 items-center justify-center overflow-hidden rounded-[20px] bg-[#f9e8d8] shadow-[0_16px_30px_rgba(17,17,17,0.12)]">
                <span className="font-display text-[2.6rem] leading-none tracking-[-0.07em] text-[#f27a3a]">
                  Good<br />Vibes<br /><span className="text-[#1d1d20]">Only</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#1d1b1d] text-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-8">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f27a3a] text-[10px] font-bold text-white">
              EP
            </span>
            <div>
              <div className="text-base font-bold tracking-[-0.04em]">Event Photo Hub</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/65">
                Capture • Share • Relive
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-white/75 md:flex">
            <Link href="/">Home</Link>
            <Link href="#events">Events</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#about">About</Link>
          </nav>

          <div className="text-xs text-white/65">© 2025 Event Photo Hub. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}

function FeaturePill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#1d1d20]/10 bg-white/60 px-3 py-2 text-[11px] font-semibold text-[#1d1d20]">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function FeatureCard({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#1d1d20]/10 bg-[#f7f3f0] p-6 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#f8e7d9] text-[#f27a3a]">
        {icon}
      </div>
      <h3 className="mb-3 text-[1.05rem] font-bold text-[#1d1d20]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#3a3632]">{detail}</p>
    </div>
  );
}

function EventCard({ date, title, subtitle, image }: { date: string; title: string; subtitle: string; image: string }) {
  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-[#1d1d20]/10 bg-white shadow-[0_18px_30px_rgba(17,17,17,0.05)]">
      <div className="h-[230px] w-full bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-[#1d1d20]/65">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#f8e7d9] text-[10px] text-[#f27a3a]">◷</span>
          {date}
        </div>
        <h3 className="text-[1.05rem] font-bold text-[#1d1d20]">{title}</h3>
        <p className="mt-2 text-sm text-[#3a3632]">{subtitle}</p>
        <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#f27a3a]">
          View Photos <span>→</span>
        </button>
      </div>
    </article>
  );
}

function PricingCard({
  title,
  price,
  suffix,
  list,
  highlight = false,
}: {
  title: string;
  price: string;
  suffix: string;
  list: string[];
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-[1.5rem] border p-6 shadow-sm ${highlight ? "border-[#f27a3a]/30 bg-[#fffaf7] shadow-[#f27a3a]/10" : "border-[#1d1d20]/10 bg-white"}`}>
      {highlight && (
        <div className="mb-3 inline-flex rounded-full bg-[#f27a3a] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
          Popular
        </div>
      )}
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1d1d20]/60">{title}</div>
      <div className="mt-5 flex items-end gap-1 font-display text-4xl tracking-[-0.06em] text-[#1d1d20]">
        <span>{price}</span>
        <span className="pb-1 text-base tracking-normal text-[#1d1d20]/60">{suffix}</span>
      </div>
      <ul className="mt-5 space-y-2 text-sm text-[#3a3632]">
        {list.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="text-[#0db56a]">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button type="button" className={`mt-6 w-full rounded-full px-4 py-3 text-sm font-semibold ${highlight ? "bg-[#f27a3a] text-white" : "border border-[#1d1d20]/10 bg-[#f5f1ee] text-[#1d1d20]"}`}>
        Get Started
      </button>
    </div>
  );
}

function StatValue({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-[2.2rem] leading-none tracking-[-0.06em] text-[#1d1d20]">{value}</div>
      <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[#1d1d20]/60">{label}</div>
    </div>
  );
}
