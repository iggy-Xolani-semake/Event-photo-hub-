import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatStorageSize } from "@/lib/format";
import type { Event, Client } from "@/types/database";

export const dynamic = "force-dynamic";

// Deliberately queries `clients` by auth_user_id to get a first name for
// the greeting — RLS (clients_select_own) already restricts this to the
// caller's own row, so no extra authorization check is needed here.
export default async function ClientHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: clientRow } = await supabase
    .from("clients")
    .select("*")
    .eq("auth_user_id", user?.id)
    .maybeSingle<Client>();

  // Same query as the admin dashboard — RLS (events_select_authenticated)
  // does the actual scoping to "only this client's events" server-side.
  // An admin visiting /client would see every event here too, since
  // is_admin() short-circuits that same policy — that's expected and
  // harmless (admins already see everything via /admin regardless).
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Event[]>();

  const firstName = clientRow?.name?.split(" ")[0];
  const myEvents = events ?? [];

  return (
    <main className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl mb-1">
        {firstName ? `Welcome, ${firstName}` : "Welcome"}
      </h1>
      <p className="text-white/50 text-sm mb-10">
        {myEvents.length === 0
          ? "You don't have any events yet."
          : `You have ${myEvents.length} event${myEvents.length !== 1 ? "s" : ""}.`}
      </p>

      {myEvents.length === 0 ? (
        <div className="border border-dashed border-white/15 rounded-xl p-10 text-center text-white/50">
          Once your event is set up, it will appear here with a link to your gallery.
        </div>
      ) : (
        <div className="grid gap-4">
          {myEvents.map((event) => (
            <Link
              key={event.id}
              href={`/gallery/${event.event_code}`}
              className="block bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-2xl p-6 transition-colors"
            >
              <p className="font-display text-xl mb-1">{event.event_name}</p>
              {event.event_date && (
                <p className="text-white/40 text-sm mb-3">
                  {new Date(event.event_date + "T00:00:00").toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              <p className="text-white/60 text-sm">
                {event.photo_count.toLocaleString()} memories ·{" "}
                {formatStorageSize(event.storage_used_bytes)}
              </p>
              <span className="inline-block mt-4 text-accent text-sm font-medium">
                See Memories →
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
