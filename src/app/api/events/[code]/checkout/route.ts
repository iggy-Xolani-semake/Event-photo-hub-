import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { findManagedEvent } from "@/lib/auth/eventAccess";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Package } from "@/types/database";

interface RouteContext {
  params: Promise<{ code: string }>;
}

/**
 * POST /api/events/{code}/checkout — start paying for an event's originals.
 *
 * Creates a PENDING payment record and returns what the client needs to hand
 * to a payment provider. It deliberately does not mark anything as paid:
 * that only happens through mark_event_paid(), which only the service role
 * can call, from a verified provider webhook or a staff confirmation.
 *
 * NO GATEWAY IS WIRED UP YET. Which provider to use (Paystack, Yoco, Stripe,
 * or plain EFT) is a business decision with real consequences for fees and
 * payouts, and each one's signature verification is different — guessing at
 * it would produce a webhook that looks secure and isn't. Until then this
 * returns the pending payment and the host confirms payment by EFT, which
 * staff mark with POST /api/admin/events/{code}/mark-paid.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { code } = await params;
  const event = await findManagedEvent(code);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (event.download_unlocked_at) {
    return NextResponse.json({
      status: "already_unlocked",
      unlockedAt: event.download_unlocked_at,
    });
  }

  const admin = createSupabaseAdminClient();

  if (!event.package_id) {
    return NextResponse.json(
      { error: "This event has no package, so there is nothing to unlock yet." },
      { status: 400 }
    );
  }

  const { data: pkg } = await admin
    .from("packages")
    .select("*")
    .eq("id", event.package_id)
    .maybeSingle<Package>();

  if (!pkg) {
    return NextResponse.json({ error: "That package no longer exists." }, { status: 400 });
  }

  // A tier with no price is not a free tier. Refusing here is what stops a
  // half-configured price list from giving originals away.
  if (pkg.price_cents === null || pkg.price_cents <= 0) {
    return NextResponse.json(
      {
        error: `${pkg.name} has no price set yet. Contact us to arrange this event.`,
        packageCode: pkg.code,
      },
      { status: 400 }
    );
  }

  // Written with the service role: clients have no INSERT policy on payments,
  // so "I paid" can never be a request body.
  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      event_id: event.id,
      package_id: pkg.id,
      amount_cents: pkg.price_cents,
      currency: pkg.currency,
      provider: null,
      status: "pending",
      metadata: { created_by: user.userId },
    })
    .select("*")
    .single();

  if (error) {
    console.error("create payment failed:", error.message);
    return NextResponse.json({ error: "Could not start the payment." }, { status: 500 });
  }

  return NextResponse.json({
    status: "awaiting_payment",
    payment,
    amountCents: pkg.price_cents,
    currency: pkg.currency,
    packageName: pkg.name,
    // Null until a provider is configured — the UI shows EFT instructions
    // rather than pretending a card form is on its way.
    checkoutUrl: null,
    message:
      "No payment gateway is connected yet. Pay by EFT and we'll unlock your downloads.",
  });
}
