import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Uses the SESSION-BOUND server client, not the admin client — RLS policy
 * "photos_update_owner" (0002_rls.sql) is what actually decides whether
 * this request is allowed, based on the caller's auth.uid(). A guest with
 * no session gets rejected by Postgres itself, not by application logic
 * we could get wrong.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { isFavourite } = (await request.json()) as { isFavourite?: boolean };

  if (typeof isFavourite !== "boolean") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("photos")
    .update({ is_favourite: isFavourite })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("favourite toggle failed:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  if (!data) {
    // RLS silently filtered the row out — caller isn't authorized, not a 404.
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
