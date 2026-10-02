import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  forwardedClientIp,
  generatePayFastSignature,
  isPayFastIp,
  parseZarCents,
  payFastValidateUrl,
  requiredPayFastConfig,
} from "@/lib/payfast";
import type { Payment } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function bad(message: string, status = 400) {
  console.warn(`PayFast ITN rejected: ${message}`);
  return NextResponse.json({ ok: false, error: "Invalid payment notification." }, { status });
}

/**
 * POST /api/payfast/itn
 *
 * PayFast calls this route before redirecting the customer back to the site.
 * The event is unlocked only after every check succeeds and the database RPC
 * performs the final idempotent state transition.
 */
export async function POST(request: NextRequest) {
  let config: ReturnType<typeof requiredPayFastConfig>;
  try {
    config = requiredPayFastConfig();
  } catch (error) {
    console.error("PayFast ITN configuration is incomplete:", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const sourceIp = forwardedClientIp(request.headers);
  if (sourceIp && !isPayFastIp(sourceIp)) {
    return bad("unexpected source IP", 403);
  }

  const rawBody = await request.text();
  if (!rawBody || rawBody.length > 32_000) return bad("empty or oversized body");

  const params = new URLSearchParams(rawBody);
  const entries = Array.from(params.entries());
  const payload = Object.fromEntries(entries);
  const receivedSignature = payload.signature?.toLowerCase();
  if (!receivedSignature || !/^[a-f0-9]{32}$/.test(receivedSignature)) {
    return bad("missing signature");
  }

  // PayFast posts signature last. Only the fields before it are signed, as
  // specified by the custom integration ITN format.
  const signatureEntries: [string, string][] = [];
  for (const [key, value] of entries) {
    if (key === "signature") break;
    signatureEntries.push([key, value]);
  }
  const expectedSignature = generatePayFastSignature(signatureEntries, config.passphrase);
  if (receivedSignature !== expectedSignature) return bad("signature mismatch", 403);

  if (payload.merchant_id !== config.merchantId) return bad("merchant mismatch", 403);
  if (!payload.m_payment_id || !UUID_RE.test(payload.m_payment_id)) return bad("invalid payment id");
  if (!payload.pf_payment_id || !/^\d+$/.test(payload.pf_payment_id)) return bad("invalid PayFast reference");

  // Confirm the exact notification with PayFast, over TLS, before trusting it.
  // This blocks a forged but correctly signed/replayed-looking payload.
  const confirmation = await fetch(payFastValidateUrl(config.mode), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/plain",
    },
    body: rawBody,
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  }).catch((error: unknown) => {
    console.error("PayFast server confirmation failed:", error);
    return null;
  });

  if (!confirmation || !confirmation.ok || (await confirmation.text()).trim() !== "VALID") {
    return bad("PayFast server confirmation failed", 502);
  }

  const admin = createSupabaseAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("*")
    .eq("id", payload.m_payment_id)
    .maybeSingle<Payment>();

  if (paymentError) {
    console.error("PayFast payment lookup failed:", paymentError.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (!payment) return bad("payment not found", 404);
  if (payment.provider !== "payfast") return bad("payment provider mismatch", 409);

  const duplicate = await admin
    .from("payments")
    .select("id")
    .eq("provider", "payfast")
    .eq("provider_reference", payload.pf_payment_id)
    .neq("id", payment.id)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (duplicate.data) return bad("PayFast reference already belongs to another payment", 409);
  if (duplicate.error) {
    console.error("PayFast duplicate-reference check failed:", duplicate.error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (payment.status === "paid") {
    return NextResponse.json({ ok: true, status: "already_paid" });
  }

  if (payload.payment_status === "CANCELLED") {
    const { error } = await admin
      .from("payments")
      .update({
        status: "failed",
        provider_reference: payload.pf_payment_id,
        metadata: { ...payment.metadata, payfast_status: "CANCELLED" },
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    if (error) {
      console.error("record cancelled PayFast payment failed:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  if (payload.payment_status !== "COMPLETE") return bad("unsupported payment status");

  const grossCents = parseZarCents(payload.amount_gross);
  if (grossCents === null || grossCents !== payment.amount_cents) {
    return bad("amount mismatch", 409);
  }

  const { error: markError } = await admin.rpc("mark_event_paid", {
    p_payment_id: payment.id,
    p_provider: "payfast",
    p_provider_reference: payload.pf_payment_id,
  });

  if (markError) {
    console.error("mark_event_paid from PayFast ITN failed:", markError.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "paid", paymentId: payment.id });
}
