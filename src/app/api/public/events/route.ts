import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("events")
    .select("event_code, event_name, event_date, created_at, visibility")
    .in("visibility", ["public", "shared"])
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("Failed to load public events:", error);
    return NextResponse.json({ events: [] }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { events: data ?? [] },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
