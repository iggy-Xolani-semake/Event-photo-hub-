import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Package } from "@/types/database";

/**
 * GET /api/packages — the tiers a client can buy.
 *
 * Public on purpose: pricing is marketing, and the create-event form needs it
 * before the client has committed to anything. Only active packages are
 * returned. `price_cents: null` means "not for sale yet" — the app must show
 * such a tier as unavailable rather than treating null as free.
 */
export async function GET() {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .returns<Package[]>();

  if (error) {
    console.error("list packages failed:", error.message);
    return NextResponse.json({ error: "Could not load packages." }, { status: 500 });
  }

  return NextResponse.json({ packages: data ?? [] });
}
