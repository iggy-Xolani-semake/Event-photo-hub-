import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Event } from "@/types/database";
import { formatStorageSize } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  // RLS (events_select_authenticated) already scopes this to "all events"
  // for an admin or "own events" for a client — this query is identical
  // regardless of caller, the database does the filtering.
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Event[]>();

  const allEvents = events ?? [];
  const activeEvents = allEvents.filter((e) => e.status === "active");
  const totalPhotos = allEvents.reduce((sum, e) => sum + e.photo_count, 0);
  const totalStorage = allEvents.reduce((sum, e) => sum + e.storage_used_bytes, 0);

  return (
    <main className="p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="font-display text-2xl mb-1">Event Photo Hub</h1>
      <p className="text-white/50 text-sm mb-8">Dashboard overview</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        <StatCard label="Active Events" value={activeEvents.length.toLocaleString()} />
        <StatCard label="Total Photos" value={totalPhotos.toLocaleString()} />
        <StatCard label="Storage Used" value={formatStorageSize(totalStorage)} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Events</h2>
        <Link
          href="/admin/events/new"
          className="bg-accent text-ink-950 font-semibold text-sm rounded-lg px-4 py-2"
        >
          + Create Event
        </Link>
      </div>

      {allEvents.length === 0 ? (
        <div className="border border-dashed border-white/15 rounded-xl p-10 text-center text-white/50">
          No events yet. Create your first event to generate a QR code and guest upload link.
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-white/50 text-sm mt-1">{label}</p>
    </div>
  );
}

function EventRow({ event }: { event: Event }) {
  const statusColor =
    event.status === "active" ? "bg-green-500/20 text-green-300" : event.status === "closed" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/50";

  return (
    <Link
      href={`/admin/events/${event.event_code}`}
      className="flex items-center justify-between bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-xl px-5 py-4 transition-colors"
    >
      <div>
        <p className="font-medium">{event.event_name}</p>
        <p className="text-white/40 text-sm">
          {event.photo_count.toLocaleString()} photos · {formatStorageSize(event.storage_used_bytes)}
        </p>
      </div>
      <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${statusColor}`}>
        {event.status}
      </span>
    </Link>
  );
}
