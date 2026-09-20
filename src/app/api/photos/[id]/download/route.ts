import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createPresignedDownloadUrl } from "@/lib/storage/signUpload";
import { resolveDownloadEntitlement } from "@/lib/auth/downloadEntitlement";
import type { Photo, Event } from "@/types/database";

/**
 * Originals are never public (see lib/storage/publicUrl.ts) — this route is
 * the only way to get a working download link for one.
 *
 * It is gated by ENTITLEMENT, not by gallery visibility. Before Sprint 3 this
 * used the same rule as the gallery page, which meant any guest holding a
 * shared event link could download every original. Now it requires ownership
 * and a paid event (or a site admin). See lib/auth/downloadEntitlement.ts.
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

  const entitlement = await resolveDownloadEntitlement(photo.event_id);

  if (!entitlement.allowed) {
    return NextResponse.json(
      {
        error:
          entitlement.reason === "unpaid_owner"
            ? "Downloads unlock once this event's package has been paid for."
            : "Not authorized.",
      },
      { status: entitlement.reason === "unpaid_owner" ? 402 : 403 }
    );
  }

  const url = await createPresignedDownloadUrl(photo.storage_path);
  return NextResponse.json({ url });
}
