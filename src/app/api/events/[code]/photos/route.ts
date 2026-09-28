import { NextResponse } from "next/server";
import { findManagedEvent } from "@/lib/auth/eventAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteFromR2 } from "@/lib/storage/r2Client";
import type { Photo } from "@/types/database";

/** R2's DeleteObjects accepts at most 1000 keys per call; stay well under. */
const R2_DELETE_BATCH = 500;

type PhotoPaths = Pick<
  Photo,
  "id" | "storage_path" | "gallery_path" | "thumbnail_path"
>;

/**
 * DELETE /api/events/[code]/photos — "Delete all" for an event's gallery.
 *
 * Authorization is delegated exactly like the single-photo delete route:
 * findManagedEvent() runs on the SESSION-BOUND client, so RLS decides
 * whether the caller owns the event (or is a site-host admin). A guest or
 * an unrelated signed-in user gets a 404 and nothing else happens.
 *
 * Order mirrors the single-delete contract: read photo paths under RLS
 * first, remove the R2 objects, THEN delete the database rows — so a
 * storage failure never leaves DB rows pointing at vanished files. The
 * events.photo_count / storage_used_bytes rollup triggers (0001_init.sql)
 * keep the event counters accurate when the photo rows go.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const event = await findManagedEvent(code);

  if (!event) {
    // "Not yours" and "doesn't exist" answer identically on purpose.
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: photos, error: fetchError } = await supabase
    .from("photos")
    .select("id, storage_path, gallery_path, thumbnail_path")
    .eq("event_id", event.id)
    .returns<PhotoPaths[]>();

  if (fetchError) {
    console.error("photo list fetch before delete-all failed:", fetchError);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  const rows = photos ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ success: true, deleted: 0 });
  }

  const keys = rows.flatMap((photo) =>
    [photo.storage_path, photo.gallery_path, photo.thumbnail_path].filter(
      (key): key is string => Boolean(key)
    )
  );

  try {
    for (let i = 0; i < keys.length; i += R2_DELETE_BATCH) {
      await deleteFromR2(keys.slice(i, i + R2_DELETE_BATCH));
    }
  } catch (err) {
    console.error("R2 bulk delete failed:", err);
    return NextResponse.json(
      { error: "Could not delete the photo files. Please try again." },
      { status: 500 }
    );
  }

  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .eq("event_id", event.id);

  if (deleteError) {
    console.error("photo rows delete failed after R2 cleanup:", deleteError);
    return NextResponse.json(
      { error: "Files were removed but the gallery could not be cleared. Please refresh." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, deleted: rows.length });
}
