import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Event } from "@/types/database";
import { HeaderBar, type HeaderEvent, type HeaderUser } from "./HeaderBar";

/**
 * The global navigation header, shared by marketing, auth, dashboard and
 * public gallery surfaces.
 *
 * Server component on purpose: which variant renders (guest vs signed-in
 * host) depends on the session, and the signed-in variant needs the host's
 * event list for the quick switcher and the unlock-reminder indicator. RLS
 * scopes that query to the caller's own events, so no extra filtering here.
 */
export async function AppHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let headerUser: HeaderUser | null = null;
  let events: HeaderEvent[] = [];

  if (user) {
    const [eventsResult, clientResult] = await Promise.all([
      supabase
        .from("events")
        .select("event_code, event_name, photo_count, download_unlocked_at, status")
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<Pick<Event, "event_code" | "event_name" | "photo_count" | "download_unlocked_at" | "status">[]>(),
      supabase
        .from("clients")
        .select("name")
        .eq("auth_user_id", user.id)
        .maybeSingle<{ name: string }>(),
    ]);

    events = eventsResult.data ?? [];
    headerUser = {
      email: user.email ?? "",
      name: clientResult.data?.name ?? null,
    };
  }

  return <HeaderBar user={headerUser} events={events} />;
}

export default AppHeader;
