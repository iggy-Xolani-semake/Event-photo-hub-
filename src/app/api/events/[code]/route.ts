import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { findManagedEvent } from "@/lib/auth/eventAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeEventLimits } from "@/lib/limits";
import { packageCeilingError } from "@/lib/packages";
import type { EventStatus, EventVisibility, Package } from "@/types/database";

const VALID_VISIBILITY: EventVisibility[] = ["private", "shared", "public"];
/** What an owner may do to their own event. Archiving is a staff action. */
const OWNER_ALLOWED_STATUS: EventStatus[] = ["active", "closed"];

interface RouteContext {
  params: Promise<{ code: string }>;
}

/**
 * PATCH /api/events/{code} — an owner edits their own event.
 *
 * Authorization is not decided in this file: findManagedEvent() queries
 * through the session-bound client, so events_select_authenticated returns
 * the row only for its owner (or an admin), and the UPDATE below is
 * separately gated by events_update_owner. Two independent Postgres checks,
 * neither of which a route can forget to apply.
 *
 * "Not found" and "not yours" both return 404 so the endpoint cannot be used
 * to discover which event codes exist.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { code } = await params;
  const event = await findManagedEvent(code);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    eventName?: string;
    eventDate?: string | null;
    visibility?: string;
    status?: string;
    uploadLimit?: number;
    maxFileSizeMb?: number;
    maxFilesPerUpload?: number;
  };

  const updates: Record<string, unknown> = {};

  if (body.eventName !== undefined) {
    const name = body.eventName?.trim();
    if (!name) {
      return NextResponse.json({ error: "Give your event a name." }, { status: 400 });
    }
    updates.event_name = name;
  }

  if (body.eventDate !== undefined) {
    updates.event_date = body.eventDate || null;
  }

  if (body.visibility !== undefined) {
    if (!VALID_VISIBILITY.includes(body.visibility as EventVisibility)) {
      return NextResponse.json({ error: "Invalid visibility." }, { status: 400 });
    }
    updates.visibility = body.visibility;
  }

  if (body.status !== undefined) {
    const allowed = user.isAdmin
      ? (["active", "closed", "archived"] as EventStatus[])
      : OWNER_ALLOWED_STATUS;
    if (!allowed.includes(body.status as EventStatus)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    updates.status = body.status;
    updates.closed_at = body.status === "closed" ? new Date().toISOString() : null;
  }

  // Omitted limits keep the event's CURRENT values — a partial PATCH must not
  // silently reset a limit back to the product default mid-event.
  const { values, errors } = normalizeEventLimits(body, {
    uploadLimit: event.upload_limit,
    maxFileSizeMb: Math.round(event.max_file_size_bytes / (1024 * 1024)),
    maxFilesPerUpload: event.max_files_per_upload,
  });
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const limitsProvided =
    body.uploadLimit !== undefined ||
    body.maxFileSizeMb !== undefined ||
    body.maxFilesPerUpload !== undefined;

  if (limitsProvided && event.package_id) {
    // The database rejects this too (protect_event_commercial_fields); doing
    // it here as well means the client gets a sentence about their package
    // instead of a raw Postgres exception.
    const supabaseForPackage = await createSupabaseServerClient();
    const { data: pkg } = await supabaseForPackage
      .from("packages")
      .select("*")
      .eq("id", event.package_id)
      .maybeSingle<Package>();

    if (pkg) {
      const ceilingError = packageCeilingError(pkg, values);
      if (ceilingError) {
        return NextResponse.json({ error: ceilingError }, { status: 400 });
      }
    }
  }

  if (limitsProvided) {
    updates.upload_limit = values.uploadLimit;
    updates.max_file_size_bytes = values.maxFileSizeMb * 1024 * 1024;
    updates.max_files_per_upload = values.maxFilesPerUpload;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }

  // Runs as the caller, so events_update_owner is the thing that authorises
  // the write — including its WITH CHECK, which is what stops an owner from
  // reassigning client_id to somebody else.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", event.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("update event failed:", error.message);
    const message = error.message.includes("OUT_OF_RANGE")
      ? "Those limits are outside what this app allows."
      : "Could not save your changes.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({ event: data });
}
