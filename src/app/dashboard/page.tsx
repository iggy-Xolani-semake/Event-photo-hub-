import { ArrowRight, Images, Share2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShareEventButton } from "@/components/admin/ShareEventButton";
import { CreateEventForm } from "@/components/dashboard/CreateEventForm";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ensureOwnClientProfile } from "@/lib/auth/eventAccess";
import { requireUser } from "@/lib/auth/requireUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatEventDate, formatStorageSize } from "@/lib/format";
import type { Event, EventStatus } from "@/types/database";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<EventStatus, BadgeTone> = {
  active: "success",
  closed: "processing",
  archived: "neutral",
};

function resolveBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export default async function ClientDashboardPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  // Creates the caller's client row on first visit. This is what makes
  // signup work whether or not the project has email confirmation turned on:
  // with confirmation ON there is no session at registration time, so the
  // profile can only be attached the first time they arrive signed in.
  // Idempotent — every later visit just returns the existing id.
  const clientId = await ensureOwnClientProfile();

  // No ownership filter here: the session-bound client runs this as the
  // signed-in user and events_select_authenticated returns an admin's whole
  // book of events or a client's own, decided by Postgres.
  const supabase = await createSupabaseServerClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Event[]>();

  const allEvents = events ?? [];
  const activeEvents = allEvents.filter((event) => event.status === "active");
  const totalPhotos = allEvents.reduce((sum, event) => sum + event.photo_count, 0);
  const nextEvent = activeEvents[0] ?? allEvents[0] ?? null;
  const nextEventUrl = nextEvent ? `${resolveBaseUrl()}/e/${nextEvent.event_code}` : null;
  const nextEventPercent = nextEvent
    ? Math.min(100, Math.round((nextEvent.photo_count / Math.max(1, nextEvent.upload_limit)) * 100))
    : 0;

  return (
    <div className="space-y-10">
      <PageHeader
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Events" }]}
        title="My events"
        description="Create an event, share its QR code, and watch the gallery fill up."
      />

      {!clientId && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm leading-relaxed text-amber-200"
        >
          We couldn&apos;t finish setting up your account. Creating an event will not work until
          this is resolved — please try again in a moment.
        </div>
      )}

      {user.isAdmin && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4 text-sm leading-relaxed text-slate-400">
          You&apos;re signed in as a site admin, so this list shows every client&apos;s events. The
          staff console is at{" "}
          <Link href="/admin" className="font-medium text-indigo-300 underline underline-offset-4 hover:text-indigo-200">
            /admin
          </Link>
          .
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Events" value={allEvents.length.toLocaleString()} />
        <Stat label="Active" value={activeEvents.length.toLocaleString()} />
        <Stat label="Photos collected" value={totalPhotos.toLocaleString()} />
      </div>

      {nextEvent && nextEventUrl && (
        <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-700">
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Your next best step
              </div>
              <h2 className="truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                Share {nextEvent.event_name}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                Guests can scan the QR code or open the link. Their memories will appear here as they arrive.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
                <span>{nextEvent.photo_count.toLocaleString()} memories so far</span>
                <span>{nextEventPercent}% of the photo allowance used</span>
                <Badge tone={STATUS_TONE[nextEvent.status]} dot={nextEvent.status === "active"}>
                  {nextEvent.status}
                </Badge>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <ShareEventButton url={nextEventUrl} title={nextEvent.event_name} />
              <ButtonLink href={`/dashboard/events/${nextEvent.event_code}`} variant="secondary" size="sm">
                Open event <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>
        </section>
      )}

      <div id="new-event" className="scroll-mt-24">
        <CreateEventForm />
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
          Your events
        </h2>

        {allEvents.length === 0 ? (
          <EmptyState
            icon={<Images className="h-6 w-6" strokeWidth={2} />}
            title="No events yet"
            description="Create your first event above to get a QR code, a guest link and a live gallery."
            action={
              <ButtonLink href="#new-event" variant="secondary">
                Create your first event
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-3">
            {allEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-3xl font-bold tracking-tight text-white tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
    </Card>
  );
}

function EventRow({ event }: { event: Event }) {
  const date = formatEventDate(event.event_date);

  return (
    <Link
      href={`/dashboard/events/${event.event_code}`}
      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4 shadow-xl transition-all hover:-translate-y-0.5 hover:border-indigo-500/40"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-100">{event.event_name}</p>
        <p className="mt-0.5 truncate text-sm text-slate-400">
          {date ? `${date} · ` : ""}
          {event.photo_count.toLocaleString()} / {event.upload_limit.toLocaleString()} memories ·{" "}
          {formatStorageSize(event.storage_used_bytes)}
        </p>
      </div>
      <Badge tone={STATUS_TONE[event.status]} dot={event.status === "active"} className="shrink-0">
        {event.status}
      </Badge>
    </Link>
  );
}
