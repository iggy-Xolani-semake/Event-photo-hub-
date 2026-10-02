import { NextResponse } from "next/server";
import { findManagedEvent } from "@/lib/auth/eventAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteFromR2 } from "@/lib/storage/r2Client";
import type { Photo } from "@/types/database";

type PhotoWithEventCode = Pick<
  Photo,
  "id" | "event_id" | "storage_path" | "gallery_path" | "thumbnail_path"
> & { events: { event_code: string } };

/**
 * Shared-gallery visibility is deliberately not sufficient for deletion.
 * The initial lookup may be permitted by the shared-gallery SELECT policy,
 * so the event is resolved again through findManagedEvent(), whose
 * session-bound query only returns events the caller owns or is an approved
 * site admin.
 *
 * The database row is deleted before R2 cleanup. Postgres and R2 cannot share
 * a transaction; deleting the row first prevents an unauthorized or failed
 * database delete from destroying the only metadata reference to the object.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: photo, error: fetchError } = await supabase
    .from("photos")
    .select("id, event_id, storage_path, gallery_path, thumbnail_path, events!inner(event_code)")
    .eq("id", id)
    .maybeSingle<PhotoWithEventCode>();

  if (fetchError) {
    console.error("photo fetch before delete failed:", fetchError);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  // Shared/public gallery access must not satisfy this check.
  const managedEvent = await findManagedEvent(photo.events.event_code);
  if (!managedEvent || managedEvent.id !== photo.event_id) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  // RLS remains the final authorization backstop. Selecting the deleted row
  // proves that a row owned by this caller was actually removed.
  const { data: deletedPhoto, error: deleteError } = await supabase
    .from("photos")
    .delete()
    .eq("id", photo.id)
    .eq("event_id", managedEvent.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (deleteError) {
    console.error("photo row delete failed:", deleteError);
    return NextResponse.json({ error: "Could not delete the photo." }, { status: 500 });
  }
  if (!deletedPhoto) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const keysToDelete = [photo.storage_path, photo.gallery_path, photo.thumbnail_path].filter(
    (key): key is string => Boolean(key)
  );
  try {
    await deleteFromR2(keysToDelete);
  } catch (err) {
    // The row is intentionally already gone. Return an explicit cleanup
    // error so monitoring/retry tooling can identify an orphaned R2 object.
    console.error("R2 cleanup failed after photo row delete:", err);
    return NextResponse.json(
      { error: "The photo was removed, but its files need cleanup. Please contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
