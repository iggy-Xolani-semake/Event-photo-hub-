import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { findManagedEvent } from "@/lib/auth/eventAccess";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { payFastHost, payFastSignature } from "@/lib/payfast";
import type { Package } from "@/types/database";

interface RouteContext {
  params: Promise<{ code: string }>;
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * POST /api/events/{code}/checkout — create a pending PayFast payment and
 * return a server-signed form payload for the host's browser to submit.
 *
 * The browser receives only the fields PayFast needs to begin checkout. The
 * passphrase remains server-only and is never included in the response.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  if (!merchantId || !merchantKey || !passphrase) {
    console.error("PayFast checkout is not configured");
    return NextResponse.json({ error: "Payment checkout is not configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const requestedCurrency = typeof body.currency === "string" ? body.currency.toUpperCase() : "ZAR";
  if (requestedCurrency !== "ZAR") {
    return NextResponse.json(
      { error: "PayFast checkout is currently available in South African rand (ZAR) only." },
      { status: 400 }
    );
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

  if (!event.package_id) {
    return NextResponse.json(
      { error: "This event has no package, so there is nothing to unlock yet." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: pkg } = await admin
    .from("packages")
    .select("*")
    .eq("id", event.package_id)
    .maybeSingle<Package>();

  if (!pkg) {
    return NextResponse.json({ error: "That package no longer exists." }, { status: 400 });
  }

  if (pkg.price_cents === null || pkg.price_cents <= 0) {
    return NextResponse.json(
      {
        error: `${pkg.name} has no price set yet. Contact us to arrange this event.`,
        packageCode: pkg.code,
      },
      { status: 400 }
    );
  }

  // PayFast settles this integration in ZAR. The amount is stored in cents in
  // Supabase and sent to PayFast as a two-decimal ZAR string.
  const amount = (pkg.price_cents / 100).toFixed(2);
  const baseUrl = appUrl();
  const fields: Array<[string, string]> = [
    ["merchant_id", merchantId],
    ["merchant_key", merchantKey],
    ["return_url", `${baseUrl}/dashboard/events/${encodeURIComponent(code)}?payment=success`],
    ["cancel_url", `${baseUrl}/dashboard/events/${encodeURIComponent(code)}?payment=cancelled`],
    ["notify_url", `${baseUrl}/api/payments/payfast/itn`],
    ["name_first", user.email.split("@")[0] || "shutaMzala host"],
    ["email_address", user.email],
    ["m_payment_id", "pending"],
    ["amount", amount],
    ["item_name", pkg.name],
    ["item_description", `Original downloads for ${event.event_name}`],
  ];

  // Create the payment before signing so m_payment_id is the immutable
  // database UUID PayFast will return in its ITN callback.
  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      event_id: event.id,
      package_id: pkg.id,
      amount_cents: pkg.price_cents,
      currency: "ZAR",
      provider: "payfast",
      status: "pending",
      metadata: { created_by: user.userId, checkout: "payfast" },
    })
    .select("*")
    .single();

  if (error || !payment) {
    console.error("create PayFast payment failed:", error?.message ?? "missing payment row");
    return NextResponse.json({ error: "Could not start the payment." }, { status: 500 });
  }

  const signedFields: Array<[string, string]> = fields.map(([key, value]) =>
    key === "m_payment_id" ? [key, payment.id] : [key, value]
  );
  const signature = payFastSignature(signedFields, passphrase);

  return NextResponse.json({
    status: "awaiting_payment",
    paymentId: payment.id,
    amountCents: pkg.price_cents,
    currency: "ZAR",
    packageName: pkg.name,
    checkoutUrl: `https://${payFastHost(process.env.PAYFAST_MODE)}/eng/process`,
    fields: Object.fromEntries(signedFields),
    signature,
    message: "Redirecting you to PayFast to complete payment.",
  });
}
