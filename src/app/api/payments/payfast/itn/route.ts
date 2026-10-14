import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  payFastAmountMatches,
  payFastHost,
  payFastParameterString,
  payFastSignature,
  secureStringEqual,
} from "@/lib/payfast";
import type { Payment } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDER = "payfast";
const COMPLETE = "COMPLETE";

/**
 * PayFast Instant Transaction Notification endpoint.
 *
 * Configure the PayFast ITN URL as:
 *   https://<app-host>/api/payments/payfast/itn
 *
 * This route is intentionally unauthenticated. PayFast calls it server-to-server.
 * It never trusts the browser return URL to unlock downloads; only a validated
 * ITN can call the service-role mark_event_paid() RPC.
 */
export async function POST(request: NextRequest) {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const mode = process.env.PAYFAST_MODE;

  if (!merchantId || !passphrase) {
    console.error("PayFast ITN is not configured: merchant ID or passphrase is missing");
    return NextResponse.json({ error: "Payment notification is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const form = new URLSearchParams(rawBody);
  const entries = Array.from(form.entries());
  const data = new Map(entries);

  const suppliedSignature = data.get("signature");
  if (!suppliedSignature) {
    return NextResponse.json({ error: "Missing PayFast signature." }, { status: 400 });
  }

  const expectedSignature = payFastSignature(entries, passphrase);
  if (!secureStringEqual(suppliedSignature, expectedSignature)) {
    console.warn("Rejected PayFast ITN with an invalid signature");
    return NextResponse.json({ error: "Invalid PayFast signature." }, { status: 400 });
  }

  if (data.get("merchant_id") !== merchantId) {
    console.warn("Rejected PayFast ITN for an unexpected merchant");
    return NextResponse.json({ error: "Invalid merchant." }, { status: 400 });
  }

  const paymentId = data.get("m_payment_id");
  const payFastPaymentId = data.get("pf_payment_id");
  const paymentStatus = data.get("payment_status");
  const amountGross = data.get("amount_gross");

  if (!paymentId || !payFastPaymentId || !paymentStatus || !amountGross) {
    return NextResponse.json({ error: "Incomplete PayFast notification." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle<Payment>();

  if (paymentError) {
    console.error("PayFast ITN payment lookup failed:", paymentError.message);
    return NextResponse.json({ error: "Could not inspect payment." }, { status: 500 });
  }

  if (!payment) {
    console.warn("Rejected PayFast ITN for an unknown payment:", paymentId);
    return NextResponse.json({ error: "Unknown payment." }, { status: 400 });
  }

  // PayFast settles in ZAR. Do not let a notification unlock a checkout that
  // was created with a different currency or a mismatched amount.
  if (payment.currency !== "ZAR" || !payFastAmountMatches(payment.amount_cents, amountGross)) {
    console.warn("Rejected PayFast ITN with a mismatched currency or amount", {
      paymentId,
      expectedCents: payment.amount_cents,
      expectedCurrency: payment.currency,
      receivedAmount: amountGross,
    });
    return NextResponse.json({ error: "Payment amount does not match." }, { status: 400 });
  }

  if (payment.status === "paid") {
    return NextResponse.json({ ok: true, status: "already_processed" });
  }

  // A cancelled or otherwise incomplete transaction must never unlock originals.
  if (paymentStatus !== COMPLETE) {
    if (paymentStatus === "CANCELLED") {
      await admin
        .from("payments")
        .update({ status: "failed", provider: PROVIDER, provider_reference: payFastPaymentId })
        .eq("id", payment.id)
        .eq("status", "pending");
    }
    return NextResponse.json({ ok: true, status: paymentStatus });
  }

  const payFastParamString = payFastParameterString(entries, true);
  const validationUrl = `https://${payFastHost(mode)}/eng/query/validate`;
  const validationResponse = await fetch(validationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/plain",
    },
    body: payFastParamString,
    cache: "no-store",
  });
  const validationResult = (await validationResponse.text()).trim();

  if (!validationResponse.ok || validationResult !== "VALID") {
    console.warn("PayFast server confirmation failed", {
      paymentId,
      httpStatus: validationResponse.status,
      result: validationResult.slice(0, 80),
    });
    return NextResponse.json({ error: "PayFast server confirmation failed." }, { status: 502 });
  }

  const { error: markError } = await admin.rpc("mark_event_paid", {
    p_payment_id: payment.id,
    p_provider: PROVIDER,
    p_provider_reference: payFastPaymentId,
  });

  if (markError) {
    console.error("PayFast ITN could not unlock payment:", markError.message);
    return NextResponse.json({ error: "Could not finalize payment." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "paid" });
}

export async function GET() {
  return NextResponse.json({ error: "PayFast ITN accepts POST notifications only." }, { status: 405 });
}
