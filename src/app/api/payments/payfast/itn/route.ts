import { NextRequest, NextResponse } from "next/server";
import {
  createPayFastParameterString,
  getPayFastSettings,
  isPayFastSource,
  verifyPayFastSignature,
} from "@/lib/payfast";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Payment } from "@/types/database";
import { payFastItnSchema } from "@/lib/validation/apiSchemas";

export const runtime = "nodejs";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "text/plain; charset=utf-8",
};

function reply(message: string, status = 200) {
  return new NextResponse(message, { status, headers: RESPONSE_HEADERS });
}

function amountToCents(amount: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = whole * 100 + fraction;
  return Number.isSafeInteger(cents) ? cents : null;
}

async function validateWithPayFast(
  url: string,
  parameterString: string
): Promise<boolean> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parameterString,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  return response.ok && (await response.text()).trim() === "VALID";
}

export async function POST(request: NextRequest) {
  const settings = getPayFastSettings();
  if (!settings) return reply("PayFast is not configured.", 503);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_768) return reply("Notification too large.", 413);

  const rawBody = await request.text();
  if (rawBody.length > 32_768) return reply("Notification too large.", 413);

  const entries = Array.from(new URLSearchParams(rawBody).entries());
  if (entries.length === 0 || new Set(entries.map(([name]) => name)).size !== entries.length) {
    return reply("Invalid notification.", 400);
  }

  const fieldsResult = payFastItnSchema.safeParse(Object.fromEntries(entries));
  if (!fieldsResult.success) return reply("Invalid notification.", 400);
  const fields = fieldsResult.data;
  if (!verifyPayFastSignature(entries, fields.signature, settings.passphrase)) {
    return reply("Invalid signature.", 400);
  }
  if (!isPayFastSource(request)) return reply("Untrusted source.", 403);
  if (fields.merchant_id !== settings.merchantId) return reply("Merchant mismatch.", 400);

  const paymentId = fields.m_payment_id;
  const providerReference = fields.pf_payment_id;

  const admin = createSupabaseAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("provider", "payfast")
    .maybeSingle<Payment>();

  if (paymentError) {
    console.error("PayFast payment lookup failed:", paymentError.message);
    return reply("Could not verify payment.", 500);
  }
  if (!payment || payment.currency !== "ZAR") return reply("Payment not found.", 404);

  const status = fields.payment_status;
  if (status === "COMPLETE") {
    const amountCents = amountToCents(fields.amount_gross ?? "");
    if (amountCents !== payment.amount_cents) return reply("Amount mismatch.", 400);
    if (payment.status === "paid" && payment.provider_reference !== providerReference) {
      return reply("Payment reference mismatch.", 409);
    }
    if (payment.status === "failed" || payment.status === "refunded") {
      return reply("Payment is no longer payable.", 409);
    }
  }

  const parameterString = createPayFastParameterString(entries, {
    includeEmptyValues: true,
  });
  try {
    const valid = await validateWithPayFast(settings.validationUrl, parameterString);
    if (!valid) return reply("PayFast could not validate notification.", 400);
  } catch (error) {
    console.error(
      "PayFast server validation failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return reply("Temporary validation failure.", 503);
  }

  if (status === "CANCELLED") {
    if (payment.status === "pending") {
      const { error } = await admin
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id)
        .eq("status", "pending");
      if (error) {
        console.error("PayFast cancellation update failed:", error.message);
        return reply("Could not record cancellation.", 500);
      }
    }
    return reply("OK");
  }

  if (status !== "COMPLETE") return reply("Unsupported payment status.", 400);

  const { error: markError } = await admin.rpc("mark_event_paid", {
    p_payment_id: payment.id,
    p_provider: "payfast",
    p_provider_reference: providerReference,
  });

  if (markError) {
    console.error("PayFast payment fulfillment failed:", markError.message);
    return reply("Could not record payment.", 500);
  }

  return reply("OK");
}