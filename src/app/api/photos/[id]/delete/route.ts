import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteFromR2 } from "@/lib/storage/r2Client";
import type { Photo } from "@/types/database";

/**
 * Uses the SESSION-BOUND server client, not the admin/service-role
 * client — the actual authorization decision is left to RLS
 * (photos_delete_owner in 0002_rls.sql, which allows an admin or the
 * event's own client), matching the same pattern as favourite/settings
 * routes elsewhere in this app. A guest with no session, or an
 * authenticated user who isn't the event's admin/client, gets filtered
 * out by Postgres before this route's R2 cleanup ever runs — so we
 * never risk deleting R2 files for a photo the caller wasn't actually
 * authorized to touch.
 *
 * Order matters: read the photo's storage paths under RLS FIRST (this
 * doubles as the authorization check — if the select returns nothing,
 * the caller isn't allowed to see/delete this photo), delete the R2
 * objects, THEN delete the database row. If the R2 delete fails, we
 * don't delete the DB row either — better to have an accessible photo
 * with orphaned-but-present files than a vanished database row pointing
 * at files that still exist and now can't be found or cleaned up later.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: photo, error: fetchError } = await supabase
    .from("photos")
    .select("*")
    .eq("id", id)
    .maybeSingle<Photo>();

  if (fetchError) {
    console.error("photo fetch before delete failed:", fetchError);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  if (!photo) {
    // RLS filtered the row out (not authorized) or it genuinely doesn't
    // exist — either way, nothing for this caller to delete.
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const keysToDelete = [photo.storage_path, photo.gallery_path, photo.thumbnail_path].filter(
    (key): key is string => Boolean(key)
  );

  try {
    await deleteFromR2(keysToDelete);
  } catch (err) {
    console.error("R2 delete failed:", err);
    return NextResponse.json(
      { error: "Could not delete the photo's files. Please try again." },
      { status: 500 }
    );
  }

  const { error: deleteError } = await supabase.from("photos").delete().eq("id", id);

  if (deleteError) {
    console.error("photo row delete failed after R2 cleanup:", deleteError);
    return NextResponse.json(
      { error: "Files were removed but the gallery entry could not be updated. Please refresh." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
