import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Search across the caller's own events and photos.
 *
 * Scope is deliberately "my stuff", not "the whole site": the session-bound
 * client is used, so `events_select_authenticated` limits events to the ones
 * this host owns (admins see everything, as elsewhere). That is the same rule
 * the dashboard uses, so search can never reveal a row the dashboard would
 * hide.
 *
 * Photos are searched by original filename, and only inside the caller's own
 * events. That second filter matters: `photos_select_shared_or_public` also
 * lets any signed-in user read photos on *other* people's shared events, so an
 * unfiltered filename search would leak a stranger's gallery into "my search".
 * We resolve the caller's event ids first and constrain to those.
 *
 * Response shape is intentionally small and already shaped for display:
 *   { query, events: [...], photos: [...] }
 */

const MAX_QUERY_LENGTH = 64;
const EVENT_LIMIT = 6;
const PHOTO_LIMIT = 6;

/**
 * The query is interpolated into a PostgREST `or()` filter, where commas and
 * parentheses are structure, not text. Stripping them (rather than trying to
 * escape them) means a host can't break out of the filter, and it costs
 * nothing real — nobody searches for "brackets".
 */
function sanitiseQuery(raw: string): string {
  return raw
    .replace(/[,()*\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

/** "2026", "2026-03" and "2026-03-14" all resolve to a date range. */
function dateRangeFor(query: string): { start: string; end: string } | null {
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(query);
  if (!match) return null;

  const [, year, month, day] = match;
  if (day && month) {
    return { start: `${year}-${month}-${day}`, end: `${year}-${month}-${day}` };
  }
  if (month) {
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    return { start: `${year}-${month}-01`, end: `${year}-${month}-${String(lastDay).padStart(2, "0")}` };
  }
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

interface EventRow {
  event_code: string;
  event_name: string;
  event_date: string | null;
  status: string;
  photo_count: number;
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const query = sanitiseQuery(request.nextUrl.searchParams.get("q") ?? "");
  if (query.length < 2) {
    return NextResponse.json({ query, events: [], photos: [] });
  }

  const supabase = await createSupabaseServerClient();
  const pattern = `%${query}%`;

  // 1. Events by name or code (RLS-scoped to the caller).
  const { data: byText, error: eventsError } = await supabase
    .from("events")
    .select("event_code, event_name, event_date, status, photo_count")
    .or(`event_name.ilike.${pattern},event_code.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(EVENT_LIMIT)
    .returns<EventRow[]>();

  if (eventsError) {
    console.error("search events failed:", eventsError.message);
    return NextResponse.json({ error: "Search is unavailable right now." }, { status: 500 });
  }

  const events = byText ?? [];

  // 2. Events by date, when the query looks like one. Kept as a second query
  //    because PostgREST cannot OR an ilike against a date comparison.
  const range = dateRangeFor(query);
  if (range && events.length < EVENT_LIMIT) {
    const { data: byDate } = await supabase
      .from("events")
      .select("event_code, event_name, event_date, status, photo_count")
      .gte("event_date", range.start)
      .lte("event_date", range.end)
      .order("event_date", { ascending: false })
      .limit(EVENT_LIMIT)
      .returns<EventRow[]>();

    const seen = new Set(events.map((event) => event.event_code));
    for (const event of byDate ?? []) {
      if (!seen.has(event.event_code) && events.length < EVENT_LIMIT) {
        events.push(event);
        seen.add(event.event_code);
      }
    }
  }

  // 3. Photos by filename, restricted to the caller's own events.
  const { data: ownedEvents } = await supabase
    .from("events")
    .select("id, event_code, event_name")
    .limit(200)
    .returns<{ id: string; event_code: string; event_name: string }[]>();

  let photos: {
    id: string;
    filename: string;
    status: string;
    eventCode: string;
    eventName: string;
  }[] = [];

  const eventById = new Map((ownedEvents ?? []).map((event) => [event.id, event]));
  if (eventById.size > 0) {
    const { data: photoRows } = await supabase
      .from("photos")
      .select("id, original_filename, status, event_id")
      .in(
        "event_id",
        Array.from(eventById.keys())
      )
      .ilike("original_filename", pattern)
      .order("uploaded_at", { ascending: false })
      .limit(PHOTO_LIMIT)
      .returns<{ id: string; original_filename: string | null; status: string; event_id: string }[]>();

    photos = (photoRows ?? []).map((photo) => {
      const parent = eventById.get(photo.event_id);
      return {
        id: photo.id,
        filename: photo.original_filename ?? "Untitled photo",
        status: photo.status,
        eventCode: parent?.event_code ?? "",
        eventName: parent?.event_name ?? "",
      };
    });
  }

  return NextResponse.json({
    query,
    events: events.map((event) => ({
      code: event.event_code,
      name: event.event_name,
      date: event.event_date,
      status: event.status,
      photoCount: event.photo_count,
    })),
    photos,
  });
}
