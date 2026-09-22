"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  CreateEventIcon,
  ShareQrIcon,
  UploadPhotoIcon,
  ViewMemoriesIcon,
} from "@/components/marketing/StepIcons";
import { MemoraLogo } from "@/components/marketing/MemoraLogo";
import MemoraHeroAnimation from "@/components/marketing/MemoraHeroAnimation";

interface PublicEvent {
  event_code: string;
  event_name: string;
  event_date: string | null;
  created_at: string;
}

function extractEventCode(value: string): string | null {
  const input = value.trim();
  if (!input) return null;

  try {
    const parsed = new URL(input.includes("://") ? input : `https://${input}`);
    const match = parsed.pathname.match(/^\/(?:e|gallery)\/([^/]+)\/?$/i);
    if (match?.[1]) return match[1].toUpperCase();
  } catch {
    // Treat non-URL input as a code below.
  }

  const code = input.replace(/^\/?(?:e|gallery)\//i, "").trim();
  return /^[A-Z0-9_-]{4,64}$/i.test(code) ? code.toUpperCase() : null;
}

export default function HomePage() {
  const router = useRouter();
  const [eventCode, setEventCode] = useState("");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<PublicEvent[]>([]);

  useEffect(() => {
    fetch("/api/public/events")
      .then((response) => (response.ok ? response.json() : { events: [] }))
      .then((body: { events?: PublicEvent[] }) => setEvents((body.events ?? []).slice(0, 8)))
      .catch(() => setEvents([]));
  }, []);

  function handleEventLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = extractEventCode(eventCode);

    if (!cleaned) {
      setError("Enter a valid event code or paste the full event link.");
      return;
    }

    setError("");
    router.push(`/e/${cleaned}`);
  }

  return (
    <main className="min-h-screen bg-ink-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <MemoraLogo size="sm" />
            <span className="text-[1.1rem] font-black tracking-[-0.04em] text-white">
              Memora
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-white/75 md:flex">
            <Link href="/" className="border-b-2 border-[#f27a3a] pb-1 text-white">
              Home
            </Link>
              <Link href="#events" className="transition hover:text-white">
              Events
            </Link>
            <Link href="#pricing" className="transition hover:text-white">
              Pricing
            </Link>
            <Link href="#about" className="transition hover:text-white">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Link href="/admin/login" className="rounded-full border border-white/20 bg-ink-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#f27a3a] focus:ring-offset-2 focus:ring-offset-ink-950">
                Sign in
              </Link>
              <Link href="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-950 shadow-sm transition hover:bg-white/85 focus:outline-none focus:ring-2 focus:ring-[#f27a3a] focus:ring-offset-2 focus:ring-offset-ink-950">
                Create event
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1200px] px-6 pb-16 pt-12 md:pb-20 md:pt-16">
        <div className="grid items-center gap-12 md:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f27a3a]/25 bg-accent/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c94c16]">
              Capture • Share • Relive
            </div>

            <h1 className="max-w-xl font-display text-5xl leading-[0.94] tracking-[-0.06em] text-white md:text-[5.1rem]">
              One <span className="text-[#c94c16]">event gallery</span> for every moment
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              Create one private gallery for your event, invite guests to contribute, and pay once
              to unlock enlarged previews and original downloads for your archive.
            </p>

            <form onSubmit={handleEventLookup} className="mt-8 max-w-[440px]">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 p-2 shadow-sm shadow-[#1d1d20]/5">
                <span className="ml-2 text-lg text-white/65">⌕</span>
                <input
                  value={eventCode}
                  onChange={(e) => {
                    setEventCode(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter code or paste event link..."
                  className="w-full border-none bg-transparent px-2 py-2 text-base text-white outline-none placeholder:text-white/45"
                />
                <button
                  type="submit"
                  aria-label="Open event"
                  className="rounded-full bg-[#e85f1f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c94c16] focus:outline-none focus:ring-2 focus:ring-[#1d1d20] focus:ring-offset-2"
                >
                  →
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            </form>

            <div className="mt-8 grid max-w-[420px] gap-3 sm:grid-cols-4">
              <FeaturePill icon="⚡" label="Preview first" />
              <FeaturePill icon="🔒" label="Owner controlled" />
              <FeaturePill icon="📷" label="Guest uploads" />
              <FeaturePill icon="✨" label="7-day upload window" />
            </div>
          </div>

          <MemoraHeroAnimation />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1200px] px-6 py-8 md:py-12">
        <div className="grid gap-6 md:grid-cols-4">
          <FeatureCard icon={<CreateEventIcon />} title="Easy to Use" detail="Just enter your event code and start adding moments." />
          <FeatureCard icon={<ShareQrIcon />} title="Invite your guests" detail="Share a QR code or event link so guests can add photos without accounts." />
          <FeatureCard icon={<UploadPhotoIcon />} title="Preview before payment" detail="Guests see a thumbnail gallery while the owner controls the archive." />
          <FeatureCard icon={<ViewMemoriesIcon />} title="Unlock the originals" detail="Pay for the event package to enable enlarged previews and individual or bulk downloads." />
        </div>
      </section>

      <section id="events" className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c94c16]">
              Featured Events
            </p>
            <h2 className="mt-3 font-display text-4xl tracking-[-0.05em] text-white">
              Explore Our Events
            </h2>
          </div>
          <span className="text-sm text-white/50">Latest public events</span>
        </div>

        {events.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {events.map((event, index) => (
              <EventCard key={event.event_code} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-ink-900 px-6 py-10 text-center text-white/60">
            No public events are available yet. Enter an event link above to open a private event.
          </div>
        )}
      </section>

      <section id="pricing" className="bg-ink-900 py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c94c16]">
                Pricing
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-[-0.05em] text-white">
                Simple &amp; Flexible Pricing
              </h2>
              <p className="mt-3 max-w-md text-base leading-relaxed text-white/70">
                Choose the plan that fits your event needs. No hidden fees.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <PricingCard title="Basic" plan="basic" price="R99" suffix="/event" list={["Access to memories", "Download up to 50", "7 day access"]} />
              <PricingCard title="Standard" plan="standard" price="R199" suffix="/event" list={["Access to memories", "Download up to 200", "30 day access"]} highlight />
              <PricingCard title="Premium" plan="premium" price="R399" suffix="/event" list={["Access to memories", "Download unlimited", "Lifetime access"]} />
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1fr_0.9fr] md:items-center">
          <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c94c16]">
              About Us
            </p>
            <h2 className="mt-3 font-display text-4xl tracking-[-0.05em] text-white">
              We&apos;re Memora
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/70">
              We believe every moment matters. Memora was created to help event organizers,
              guests and families easily capture and share the best moments from their special occasions.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              <StatValue value="100+" label="Events Hosted" />
              <StatValue value="50K+" label="Memories Shared" />
              <StatValue value="100%" label="Happy Clients" />
            </div>
          </div>

          <div className="relative flex min-h-[260px] items-center justify-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-44 w-32 overflow-hidden rounded-[20px] bg-cover bg-center shadow-[0_16px_30px_rgba(17,17,17,0.12)]" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80)" }} />
              <div className="h-44 w-32 overflow-hidden rounded-[20px] bg-cover bg-center shadow-[0_16px_30px_rgba(17,17,17,0.12)]" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=900&q=80)" }} />
              <div className="h-44 w-32 overflow-hidden rounded-[20px] bg-cover bg-center shadow-[0_16px_30px_rgba(17,17,17,0.12)]" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80)" }} />
              <div className="relative flex h-44 w-32 items-center justify-center overflow-hidden rounded-[20px] bg-ink-800 shadow-[0_16px_30px_rgba(17,17,17,0.12)]">
                <span className="font-display text-[2.6rem] leading-none tracking-[-0.07em] text-[#c94c16]">
                  Good<br />Vibes<br /><span className="text-white">Only</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#1d1b1d] text-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-8">
          <div className="flex items-center gap-3">
            <MemoraLogo size="sm" />
            <div>
              <div className="text-base font-bold tracking-[-0.04em]">Memora</div>
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

          <div className="text-xs text-white/65">© 2025 Memora. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}

function FeaturePill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function FeatureCard({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-ink-900 p-6 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent/15 text-[#c94c16]">
        {icon}
      </div>
      <h3 className="mb-3 text-[1.05rem] font-bold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-white/70">{detail}</p>
    </div>
  );
}

function EventCard({ event }: { event: PublicEvent }) {
  const date = event.event_date
    ? new Date(`${event.event_date}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    : "Date to be announced";
  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-ink-900 shadow-[0_18px_30px_rgba(17,17,17,0.05)]">
      <div className="flex h-[150px] items-center justify-center bg-ink-800 text-5xl" aria-hidden="true">📷</div>
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-white/65">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent/15 text-[10px] text-[#c94c16]">◷</span>
          {date} · {event.event_code}
        </div>
        <h3 className="text-[1.05rem] font-bold text-white">{event.event_name}</h3>
        <p className="mt-2 text-sm text-white/60">Public memory gallery</p>
      </div>
    </article>
  );
}

function PricingCard({
  title,
  plan,
  price,
  suffix,
  list,
  highlight = false,
}: {
  title: string;
  plan: string;
  price: string;
  suffix: string;
  list: string[];
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-[1.5rem] border p-6 shadow-sm ${highlight ? "border-[#f27a3a]/30 bg-ink-900 shadow-[#f27a3a]/10" : "border-white/10 bg-ink-900"}`}>
      {highlight && (
        <div className="mb-3 inline-flex rounded-full bg-[#c94c16] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
          Popular
        </div>
      )}
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">{title}</div>
      <div className="mt-5 flex items-end gap-1 font-display text-4xl tracking-[-0.06em] text-white">
        <span>{price}</span>
        <span className="pb-1 text-base tracking-normal text-white/60">{suffix}</span>
      </div>
      <ul className="mt-5 space-y-2 text-sm text-white/70">
        {list.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="text-emerald-300">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <Link href={`/signup?plan=${plan}`} className={`mt-6 flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold ${highlight ? "bg-[#c94c16] text-white" : "border border-white/10 bg-ink-950 text-white"}`}>
        Get Started
      </Link>
    </div>
  );
}

function StatValue({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-[2.2rem] leading-none tracking-[-0.06em] text-white">{value}</div>
      <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/60">{label}</div>
    </div>
  );
}
