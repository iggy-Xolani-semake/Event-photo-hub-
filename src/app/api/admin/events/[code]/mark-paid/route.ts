import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Event, Package, Payment } from "@/types/database";

interface RouteContext {
  params: Promise<{ code: string }>;
}

/**
 * POST /api/admin/events/{code}/mark-paid — staff confirm a payment that
 * happened outside the app (EFT, cash, an invoice paid late).
 *
 * This is the working revenue path today, because no gateway is connected.
 * It is admin-only, and it does not write events.download_unlocked_at itself:
 * it goes through mark_event_paid(), the single SECURITY DEFINER function
 * allowed to open that gate, so an automated webhook and a human confirming
 * an EFT can never disagree about what "paid" means.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { code } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    amountCents?: number;
    reference?: string;
  };

  const supabase = createSupabaseAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("event_code", code.toUpperCase())
    .maybeSingle<Event>();

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (event.download_unlocked_at) {
    return NextResponse.json({ status: "already_unlocked", unlockedAt: event.download_unlocked_at });
  }

  // Reuse an existing pending payment (e.g. one the host started themselves)
  // rather than stacking duplicate rows for the same event.
  const { data: pending } = await supabase
    .from("payments")
    .select("*")
    .eq("event_id", event.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<Payment[]>();

  let payment = pending?.[0];

  if (!payment) {
    let amountCents = body.amountCents;

    if (!amountCents && event.package_id) {
      const { data: pkg } = await supabase
        .from("packages")
        .select("*")
        .eq("id", event.package_id)
        .maybeSingle<Package>();
      amountCents = pkg?.price_cents ?? undefined;
    }

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json(
        { error: "No price on this event's package — pass amountCents explicitly." },
        { status: 400 }
      );
    }

    const { data: created, error } = await supabase
      .from("payments")
      .insert({
        event_id: event.id,
        package_id: event.package_id,
        amount_cents: amountCents,
        currency: "ZAR",
        provider: "manual",
        provider_reference: body.reference ?? null,
        status: "pending",
        metadata: { confirmed_by: admin.userId },
      })
      .select("*")
      .single();

    if (error) {
      console.error("create manual payment failed:", error.message);
      return NextResponse.json({ error: "Could not record the payment." }, { status: 500 });
    }
    payment = created as Payment;
  }

  const { error: markError } = await supabase.rpc("mark_event_paid", {
    p_payment_id: payment.id,
    p_provider: "manual",
    p_provider_reference: body.reference ?? null,
  });

  if (markError) {
    console.error("mark_event_paid failed:", markError.message);
    return NextResponse.json({ error: "Could not unlock this event." }, { status: 500 });
  }

  return NextResponse.json({ status: "paid", paymentId: payment.id });
}
