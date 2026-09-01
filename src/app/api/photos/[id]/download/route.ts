import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createPresignedDownloadUrl } from "@/lib/storage/signUpload";
import type { Photo, Event } from "@/types/database";

/**
 * Originals are never public (see lib/storage/publicUrl.ts) — this route
 * is the only way to get a working download link for one, and it's gated
 * by the SAME visibility rule as the gallery page itself: public/shared
 * events allow anyone with the link, private events require ownership.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: photo } = await admin
    .from("photos")
    .select("*, events!inner(*)")
    .eq("id", id)
    .maybeSingle<Photo & { events: Event }>();

  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  if (photo.events.visibility === "private") {
    // Re-check via the session-bound client so RLS enforces ownership —
    // same pattern as the gallery page's private-event branch.
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const sessionClient = await createSupabaseServerClient();
    const { data: authorized } = await sessionClient
      .from("events")
      .select("id")
      .eq("id", photo.event_id)
      .maybeSingle();

    if (!authorized) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
  }

  const url = await createPresignedDownloadUrl(photo.storage_path);
  return NextResponse.json({ url });
}
