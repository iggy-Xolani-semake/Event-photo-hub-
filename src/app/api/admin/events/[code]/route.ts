import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventStatus } from "@/types/database";

const VALID_STATUSES: EventStatus[] = ["active", "closed", "archived"];

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
