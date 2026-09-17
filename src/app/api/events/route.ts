import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { ensureOwnClientProfile } from "@/lib/auth/eventAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateEventCode } from "@/lib/eventCode";
import { DEFAULT_EVENT_LIMITS, normalizeEventLimits } from "@/lib/limits";
import { packageCeilingError } from "@/lib/packages";
import type { Event, EventVisibility, Package } from "@/types/database";

const VALID_VISIBILITY: EventVisibility[] = ["private", "shared", "public"];

/**
 * GET /api/events — the caller's own events.
 *
 * There is no filter in this handler on purpose: the session-bound client
 * runs the query as the signed-in user, and events_select_authenticated
 * returns every event for an admin or only the caller's own events for a
 * client. Same code, two correct answers, decided by Postgres.
 */
export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Event[]>();

  if (error) {
    console.error("list events failed:", error.message);
    return NextResponse.json({ error: "Could not load your events." }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

/**
 * POST /api/events — a client creates an event they own.
 *
 * Differences from the admin route (/api/admin/events), which stays for
 * site-host staff creating events on a client's behalf:
 *   - no client name/email in the body: the owner IS the client, resolved
 *     from their session via create_own_client_profile()
 *   - every limit is validated against src/lib/limits.ts before it reaches
 *     the database, and rejected with a readable message rather than
 *     clamped silently
 *   - the insert runs as the caller, so the events_insert_owner policy is
 *     what actually authorises it — a forged client_id in the body is
 *     ignored because we never read one
 */
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    eventName?: string;
    eventDate?: string;
    visibility?: string;
    packageCode?: string;
    uploadLimit?: number;
    maxFileSizeMb?: number;
    maxFilesPerUpload?: number;
  };

  const eventName = body.eventName?.trim();
  if (!eventName) {
    return NextResponse.json({ error: "Give your event a name." }, { status: 400 });
  }

  if (body.visibility && !VALID_VISIBILITY.includes(body.visibility as EventVisibility)) {
    return NextResponse.json({ error: "Invalid visibility." }, { status: 400 });
  }

  const supabaseForPackage = await createSupabaseServerClient();

  // A package is optional: events created without one keep the app-wide caps
  // from src/lib/limits.ts. With one, the package becomes the ceiling and its
  // numbers become the defaults, so a client who just picks "250 Photos" gets
  // a correctly configured event without touching three fields.
  let selectedPackage: Package | null = null;
  if (body.packageCode) {
    const { data: pkg } = await supabaseForPackage
      .from("packages")
      .select("*")
      .eq("code", body.packageCode)
      .eq("is_active", true)
      .maybeSingle<Package>();

    if (!pkg) {
      return NextResponse.json({ error: "That package isn't available." }, { status: 400 });
    }
    selectedPackage = pkg;
  }

  const packageDefaults = selectedPackage
    ? {
        uploadLimit: selectedPackage.photo_limit,
        maxFileSizeMb: Math.round(selectedPackage.max_file_size_bytes / (1024 * 1024)),
        maxFilesPerUpload: selectedPackage.max_files_per_upload,
      }
    : DEFAULT_EVENT_LIMITS;

  const { values, errors } = normalizeEventLimits(body, packageDefaults);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  if (selectedPackage) {
    const ceilingError = packageCeilingError(selectedPackage, values);
    if (ceilingError) {
      return NextResponse.json({ error: ceilingError }, { status: 400 });
    }
  }

  const clientId = await ensureOwnClientProfile();
  if (!clientId) {
    return NextResponse.json(
      { error: "We couldn't set up your account. Please try again." },
      { status: 500 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Event codes are random 8-character strings, so collisions are vanishingly
  // unlikely — but the unique index is the real guard, and we cannot pre-check
  // it with this client: RLS hides other clients' events, so a lookup would
  // report "free" for a code that is taken. Insert and retry on 23505 instead,
  // which is correct under concurrency as well as under RLS.
  const MAX_CODE_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase
      .from("events")
      .insert({
        event_code: generateEventCode(),
        event_name: eventName,
        event_date: body.eventDate || null,
        client_id: clientId,
        package_id: selectedPackage?.id ?? null,
        visibility: (body.visibility as EventVisibility) ?? "shared",
        upload_limit: values.uploadLimit,
        max_file_size_bytes: values.maxFileSizeMb * 1024 * 1024,
        max_files_per_upload: values.maxFilesPerUpload,
        created_by: user.userId,
      })
      .select("*")
      .single();

    if (!error) {
      return NextResponse.json({ event: data }, { status: 201 });
    }

    if (error.code !== "23505") {
      console.error("create event failed:", error.message);
      const message = error.message.includes("OUT_OF_RANGE")
        ? "Those limits are outside what this app allows."
        : "Could not create your event. Please try again.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Could not allocate an event code. Please try again." }, { status: 500 });
}
