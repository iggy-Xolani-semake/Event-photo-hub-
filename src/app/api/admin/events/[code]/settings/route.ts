import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventVisibility } from "@/types/database";

const VALID_VISIBILITY: EventVisibility[] = ["private", "shared", "public"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { code } = await params;
  const body = await request.json();
  const { eventName, eventDate, uploadLimit, maxFileSizeMb, maxFilesPerUpload, visibility } = body as {
    eventName?: string;
    eventDate?: string | null;
    uploadLimit?: number;
    maxFileSizeMb?: number;
    maxFilesPerUpload?: number;
    visibility?: string;
  };

  if (visibility && !VALID_VISIBILITY.includes(visibility as EventVisibility)) {
    return NextResponse.json({ error: "Invalid visibility." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (eventName !== undefined) updates.event_name = eventName;
  if (eventDate !== undefined) updates.event_date = eventDate || null;
  if (uploadLimit !== undefined) updates.upload_limit = uploadLimit;
  if (maxFileSizeMb !== undefined) updates.max_file_size_bytes = maxFileSizeMb * 1024 * 1024;
  if (maxFilesPerUpload !== undefined) updates.max_files_per_upload = maxFilesPerUpload;
  if (visibility !== undefined) updates.visibility = visibility;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
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
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
