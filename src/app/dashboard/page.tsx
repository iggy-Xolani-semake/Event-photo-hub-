import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { ensureOwnClientProfile } from "@/lib/auth/eventAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateEventForm } from "@/components/dashboard/CreateEventForm";
import { formatEventDate, formatStorageSize } from "@/lib/format";
import type { Event } from "@/types/database";

export const dynamic = "force-dynamic";

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
  const activeEvents = allEvents.filter((e) => e.status === "active");
  const totalPhotos = allEvents.reduce((sum, e) => sum + e.photo_count, 0);

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-8">
      <h1 className="font-display text-2xl mb-1">My events</h1>
      <p className="text-white/50 text-sm mb-8">
        Create an event, share its QR code, and watch the gallery fill up.
      </p>

      {!clientId && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          We couldn&apos;t finish setting up your account. Creating an event will not work until
          this is resolved — please try again in a moment.
        </div>
      )}

      {user.isAdmin && (
        <div className="mb-6 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
          You&apos;re signed in as a site admin, so this list shows every client&apos;s events. The
          staff console is at{" "}
          <Link href="/admin" className="text-accent underline">
            /admin
          </Link>
          .
        </div>
      )}

      <div className="mb-8 grid grid-cols-3 gap-4">
        <Stat label="Events" value={allEvents.length.toLocaleString()} />
        <Stat label="Active" value={activeEvents.length.toLocaleString()} />
        <Stat label="Photos collected" value={totalPhotos.toLocaleString()} />
      </div>

      <div className="mb-10">
        <CreateEventForm />
      </div>

      <h2 className="text-lg font-medium mb-4">Your events</h2>

      {allEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-white/50">
          No events yet. Create your first one above to get a QR code and guest link.
        </div>
      ) : (
        <div className="grid gap-3">
          {allEvents.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-white/50">{label}</p>
    </div>
  );
}

function EventRow({ event }: { event: Event }) {
  const statusStyle =
    event.status === "active"
      ? "bg-green-500/20 text-green-300"
      : event.status === "closed"
        ? "bg-amber-500/20 text-amber-300"
        : "bg-white/10 text-white/50";

  const date = formatEventDate(event.event_date);

  return (
    <Link
      href={`/dashboard/events/${event.event_code}`}
      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 transition-colors hover:bg-white/[0.07]"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{event.event_name}</p>
        <p className="text-sm text-white/40">
          {date ? `${date} · ` : ""}
          {event.photo_count.toLocaleString()} / {event.upload_limit.toLocaleString()} photos ·{" "}
          {formatStorageSize(event.storage_used_bytes)}
        </p>
      </div>
      <span className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle}`}>
        {event.status}
      </span>
    </Link>
  );
}
