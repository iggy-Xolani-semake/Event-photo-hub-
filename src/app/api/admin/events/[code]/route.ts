import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteFromR2 } from "@/lib/storage/r2Client";
import type { EventStatus, Photo } from "@/types/database";

const VALID_STATUSES: EventStatus[] = ["active", "closed", "archived"];

/** R2's DeleteObjects accepts at most 1000 keys per call; stay well under. */
const R2_DELETE_BATCH = 500;

/**
 * Uses the SESSION-BOUND client, not admin/service-role — RLS policy
 * "events_admin_update" only allows this for is_admin() sessions, which
 * matches requireAdmin()'s check. Belt-and-braces: even if requireAdmin()
 * had a bug, RLS is the actual backstop here, not application logic alone.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { code } = await params;
  const { status } = (await request.json()) as { status?: string };

  if (!status || !VALID_STATUSES.includes(status as EventStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .update({ status })
    .eq("event_code", code.toUpperCase())
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("event status update failed:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE — permanently remove a whole event (site-host admin only).
 *
 * Same belt-and-braces pattern as PATCH above: requireAdmin() gates the
 * route, and RLS is the real backstop — the event SELECT and the final
 * DELETE both run on the session-bound client, where events_select_* /
 * events_admin_delete (0002_rls.sql) only let an is_admin() session see
 * and remove the row.
 *
 * Cleanup order matters: every photo's R2 objects (original, gallery
 * rendition, thumbnail) are deleted BEFORE the event row. Removing the
 * event row cascades to photos, payments and guest_sessions in Postgres
 * (0001/0006/0012 migrations), so if R2 fails we stop and nothing in the
 * database has changed — no dangling rows pointing at vanished files.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { code } = await params;
  const eventCode = code.toUpperCase();
  const supabase = await createSupabaseServerClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("event_code", eventCode)
    .maybeSingle<{ id: string }>();

  if (eventError) {
    console.error("event fetch before admin delete failed:", eventError);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { data: photos, error: photosError } = await supabase
    .from("photos")
    .select("storage_path, gallery_path, thumbnail_path")
    .eq("event_id", event.id)
    .returns<Pick<Photo, "storage_path" | "gallery_path" | "thumbnail_path">[]>();

  if (photosError) {
    console.error("photo list fetch before admin event delete failed:", photosError);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  const keys = (photos ?? []).flatMap((photo) =>
    [photo.storage_path, photo.gallery_path, photo.thumbnail_path].filter(
      (key): key is string => Boolean(key)
    )
  );

  try {
    for (let i = 0; i < keys.length; i += R2_DELETE_BATCH) {
      await deleteFromR2(keys.slice(i, i + R2_DELETE_BATCH));
    }
  } catch (err) {
    console.error("R2 bulk delete failed during admin event delete:", err);
    return NextResponse.json(
      { error: "Could not delete the event's photo files. Please try again." },
      { status: 500 }
    );
  }

  const { error: deleteError } = await supabase
    .from("events")
    .delete()
    .eq("id", event.id);

  if (deleteError) {
    console.error("event row delete failed after R2 cleanup:", deleteError);
    return NextResponse.json(
      { error: "Files were removed but the event could not be deleted. Please refresh." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, deletedPhotoFiles: keys.length });
}
