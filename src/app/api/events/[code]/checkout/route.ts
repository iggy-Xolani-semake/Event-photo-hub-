import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { findManagedEvent } from "@/lib/auth/eventAccess";
import { createPayFastSignature, getPayFastSettings } from "@/lib/payfast";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Package } from "@/types/database";
import { payFastCheckoutParamsSchema } from "@/lib/validation/apiSchemas";

interface RouteContext {
  params: Promise<{ code: string }>;
}

/**
 * POST /api/events/{code}/checkout — start paying for an event's originals.
 *
 * Creates a pending payment and returns signed fields for PayFast's hosted
 * checkout. Only a verified PayFast ITN can mark the payment paid.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { code } = await params;
  const routeParams = payFastCheckoutParamsSchema.safeParse({ eventCode: code });
  if (!routeParams.success) {
    return NextResponse.json({ error: "Invalid event code." }, { status: 400 });
  }
  const event = await findManagedEvent(routeParams.data.eventCode);
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

  if (pkg.currency.toUpperCase() !== "ZAR") {
    return NextResponse.json(
      { error: "PayFast checkout is only available for packages priced in ZAR." },
      { status: 400 }
    );
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

  if (pkg.price_cents < 500) {
    return NextResponse.json(
      { error: "PayFast requires a minimum payment of R5.00." },
      { status: 400 }
    );
  }

  const settings = getPayFastSettings();
  if (!settings) {
    return NextResponse.json(
      { error: "PayFast is not configured yet. Please contact support." },
      { status: 503 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  let appOrigin: URL;
  try {
    appOrigin = new URL(appUrl ?? "");
  } catch {
    return NextResponse.json(
      { error: "The application URL is not configured for payments." },
      { status: 503 }
    );
  }

  if (settings.mode === "live" && appOrigin.protocol !== "https:") {
    return NextResponse.json(
      { error: "Live PayFast checkout requires an HTTPS application URL." },
      { status: 503 }
    );
  }

  const amountCents = pkg.price_cents;

  // Written with the service role: clients have no INSERT policy on payments,
  // so "I paid" can never be a request body.
  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      event_id: event.id,
      package_id: pkg.id,
      amount_cents: amountCents,
      currency: "ZAR",
      provider: "payfast",
      status: "pending",
      metadata: { created_by: user.userId },
    })
    .select("*")
    .single();

  if (error) {
    console.error("create payment failed:", error.message);
    return NextResponse.json({ error: "Could not start the payment." }, { status: 500 });
  }

  const eventUrl = new URL(
    `/dashboard/events/${encodeURIComponent(event.event_code)}`,
    appOrigin
  ).toString();
  const checkoutFields: Record<string, string> = {
    merchant_id: settings.merchantId,
    merchant_key: settings.merchantKey,
    return_url: eventUrl,
    cancel_url: `${eventUrl}?payment=cancelled`,
    notify_url: new URL("/api/payments/payfast/itn", appOrigin).toString(),
    ...(user.email ? { email_address: user.email } : {}),
    m_payment_id: payment.id,
    amount: (amountCents / 100).toFixed(2),
    item_name: `${pkg.name} - ${event.event_name}`.slice(0, 100),
    item_description: `Unlock original downloads for ${event.event_name}`.slice(0, 255),
  };
  checkoutFields.signature = createPayFastSignature(
    Object.entries(checkoutFields),
    settings.passphrase
  );

  return NextResponse.json({
    status: "awaiting_payment",
    paymentId: payment.id,
    amountCents,
    currency: "ZAR",
    packageName: pkg.name,
    checkoutUrl: settings.processUrl,
    checkoutFields,
  });
}
