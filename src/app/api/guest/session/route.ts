import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { guestSessionCookieName, isValidEventCodeFormat } from "@/lib/eventCode";

/**
 * Issues the anonymous guest session that the per-guest upload quota is
 * counted against (migration 0012).
 *
 * The token is the guest's ONLY identity — no email, no phone, no browser
 * fingerprint. It is scoped to one event, so a token minted here cannot carry
 * its counter into another event, and it is opaque: 64 hex characters from
 * two server-generated UUIDs.
 *
 * Guests never read or write guest_sessions directly (RLS has no anon
 * policies on it). They present the token here and to /api/upload/confirm,
 * and those routes talk to the table with the service role. That is what
 * stops a browser from resetting its own upload_count.
 *
 * Called with a token the server recognises for THIS event, it returns the
 * same session with its existing count — re-arriving at the event must not
 * hand out a fresh quota.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventCode: rawEventCode } = body as { eventCode?: string };

    if (!rawEventCode || !isValidEventCodeFormat(rawEventCode.toUpperCase())) {
      return NextResponse.json({ error: "Invalid event code." }, { status: 400 });
    }

    const eventCode = rawEventCode.toUpperCase();
    const existingToken = request.cookies.get(guestSessionCookieName(eventCode))?.value ?? null;

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("register_guest_session", {
      p_event_code: eventCode,
      p_existing_token: existingToken,
    });

    if (error) {
      const code = error.message?.match(/[A-Z_]+/)?.[0] ?? "UNKNOWN";
      return NextResponse.json(
        {
          error:
            code === "EVENT_NOT_FOUND"
              ? "We couldn't find this event. Please check the link or QR code."
              : "We couldn't start your upload session. Please try again.",
        },
        { status: code === "EVENT_NOT_FOUND" ? 404 : 400 }
      );
    }

    const row = (
      data as { session_token: string; upload_count: number; guest_photo_limit: number }[] | null
    )?.[0];
    if (!row) {
      // An empty result set means the event doesn't exist: register_guest_session
      // raises EVENT_NOT_FOUND rather than returning nothing, so reaching this
      // branch is the same outcome through a different shape. Say 404, not 500 —
      // a guest scanning a dead QR code must not be told "try again".
      return NextResponse.json(
        { error: "We couldn't find this event. Please check the link or QR code." },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      uploadCount: row.upload_count,
      guestPhotoLimit: row.guest_photo_limit,
      remaining: Math.max(0, row.guest_photo_limit - row.upload_count),
    });
    response.cookies.set(guestSessionCookieName(eventCode), row.session_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("guest session error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
