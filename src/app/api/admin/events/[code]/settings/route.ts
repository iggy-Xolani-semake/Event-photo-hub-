import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventVisibility } from "@/types/database";

const VALID_VISIBILITY: EventVisibility[] = ["private", "shared", "public"];

/**
 * Admin-only fields vs. fields a collaborator can also touch:
 *   - collaboratorEmail (assigning/changing who the collaborator is) is
 *     admin-only — a collaborator shouldn't be able to hand the role to
 *     someone else or remove themselves from an event.
 *   - Everything else (name, date, limits, visibility) matches what the
 *     events_update_collaborator RLS policy (0010_collaborators.sql)
 *     already allows a collaborator to change on their one assigned
 *     event — this route just needs to not block them with a hard
 *     admin-only gate before RLS even gets a say.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await request.json();
  const {
    eventName,
    eventDate,
    uploadLimit,
    maxFileSizeMb,
    maxFilesPerUpload,
    visibility,
    collaboratorEmail,
  } = body as {
    eventName?: string;
    eventDate?: string | null;
    uploadLimit?: number;
    maxFileSizeMb?: number;
    maxFilesPerUpload?: number;
    visibility?: string;
    collaboratorEmail?: string | null;
  };

  if (visibility && !VALID_VISIBILITY.includes(visibility as EventVisibility)) {
    return NextResponse.json({ error: "Invalid visibility." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const updates: Record<string, unknown> = {};

  if (eventName !== undefined) updates.event_name = eventName;
  if (eventDate !== undefined) updates.event_date = eventDate || null;
  if (uploadLimit !== undefined) updates.upload_limit = uploadLimit;
  if (maxFileSizeMb !== undefined) updates.max_file_size_bytes = maxFileSizeMb * 1024 * 1024;
  if (maxFilesPerUpload !== undefined) updates.max_files_per_upload = maxFilesPerUpload;
  if (visibility !== undefined) updates.visibility = visibility;

  if (collaboratorEmail !== undefined) {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Only an admin can assign a collaborator." },
        { status: 403 }
      );
    }

    if (collaboratorEmail === null || collaboratorEmail === "") {
      updates.collaborator_id = null;
    } else {
      // Reuse an existing collaborator by email, same pattern as client
      // lookup in the create-event route, so re-inviting the same
      // photographer to a second event doesn't create duplicate rows.
      const { data: existing } = await supabase
        .from("collaborators")
        .select("id")
        .ilike("email", collaboratorEmail)
        .maybeSingle();

      if (existing) {
        updates.collaborator_id = existing.id;
      } else {
        const { data: created, error: createError } = await supabase
          .from("collaborators")
          .insert({ name: collaboratorEmail.split("@")[0], email: collaboratorEmail })
          .select("id")
          .single();

        if (createError) {
          console.error("collaborator insert failed:", createError);
          return NextResponse.json({ error: "Could not create collaborator." }, { status: 500 });
        }
        updates.collaborator_id = created.id;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }

  // No requireAdmin() gate here for the general case — RLS itself
  // (events_admin_update OR events_update_collaborator) decides whether
  // this specific caller may update this specific event. A guest with no
  // session, or a collaborator assigned to a DIFFERENT event, gets
  // filtered out by Postgres, not by application logic we could get
  // wrong.
  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("event_code", code.toUpperCase())
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("event settings update failed:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Event not found, or you don't have access to edit it." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
