import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { findManagedEvent } from "@/lib/auth/eventAccess";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  generatePayFastSignature,
  payFastProcessUrl,
  requiredPayFastConfig,
} from "@/lib/payfast";
import type { Package, Payment } from "@/types/database";

interface RouteContext {
  params: Promise<{ code: string }>;
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

/**
 * POST /api/events/{code}/checkout — create a PayFast hosted checkout.
 *
 * The browser receives a PayFast URL and signed form fields, but never gets
 * the passphrase. The payment stays pending until the public ITN route has
 * verified PayFast's signature, amount, merchant, and server confirmation.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!APP_URL || !/^https:\/\//i.test(APP_URL)) {
    console.error("NEXT_PUBLIC_APP_URL must be an absolute HTTPS URL for PayFast");
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  let config: ReturnType<typeof requiredPayFastConfig>;
  try {
    config = requiredPayFastConfig();
  } catch (error) {
    console.error("PayFast configuration is incomplete:", error);
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { currency?: unknown };
  const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "ZAR";
  if (currency !== "ZAR") {
    return NextResponse.json(
      { error: "PayFast checkout is available in ZAR only. Please select ZAR and try again." },
      { status: 400 },
    );
  }

  const { code } = await params;
  const event = await findManagedEvent(code);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (event.download_unlocked_at) {
    return NextResponse.json({ status: "already_unlocked", unlockedAt: event.download_unlocked_at });
  }

  if (!event.package_id) {
    return NextResponse.json(
      { error: "This event has no package, so there is nothing to unlock yet." },
      { status: 400 },
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
      { error: `${pkg.name} has no price set yet. Contact us to arrange this event.`, packageCode: pkg.code },
      { status: 400 },
    );
  }

  // Reuse the newest pending PayFast payment for this event/package. This
  // avoids creating orphaned pending rows when a customer double-clicks.
  const { data: pendingRows } = await admin
    .from("payments")
    .select("*")
    .eq("event_id", event.id)
    .eq("package_id", pkg.id)
    .eq("provider", "payfast")
    .eq("status", "pending")
    .eq("currency", "ZAR")
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<Payment[]>();

  let payment = pendingRows?.[0];
  if (!payment) {
    const { data: created, error } = await admin
      .from("payments")
      .insert({
        event_id: event.id,
        package_id: pkg.id,
        amount_cents: pkg.price_cents,
        currency: "ZAR",
        provider: "payfast",
        status: "pending",
        metadata: { created_by: user.userId, gateway: "payfast", mode: config.mode },
      })
      .select("*")
      .single<Payment>();

    if (error || !created) {
      console.error("create PayFast payment failed:", error?.message);
      return NextResponse.json({ error: "Could not start the payment." }, { status: 500 });
    }
    payment = created;
  }

  const fields: [string, string][] = [
    ["merchant_id", config.merchantId],
    ["merchant_key", config.merchantKey],
    ["return_url", `${APP_URL}/dashboard?payment=success&payment_id=${payment.id}`],
    ["cancel_url", `${APP_URL}/dashboard?payment=cancelled&payment_id=${payment.id}`],
    ["notify_url", `${APP_URL}/api/payfast/itn`],
    ["name_first", "Customer"],
    ["email_address", user.email],
    ["m_payment_id", payment.id],
    ["amount", (payment.amount_cents / 100).toFixed(2)],
    ["item_name", pkg.name.slice(0, 100)],
    ["item_description", `Original downloads for ${event.event_name}`.slice(0, 255)],
    ["custom_str1", event.event_code],
  ];

  const signature = generatePayFastSignature(fields, config.passphrase);
  return NextResponse.json({
    status: "payment_started",
    paymentId: payment.id,
    amountCents: payment.amount_cents,
    currency: payment.currency,
    packageName: pkg.name,
    checkoutUrl: payFastProcessUrl(config.mode),
    checkoutFields: Object.fromEntries([...fields, ["signature", signature]]),
    message: "Redirecting to PayFast…",
  });
}
