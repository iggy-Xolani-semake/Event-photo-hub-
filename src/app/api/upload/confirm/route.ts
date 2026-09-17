import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { guestSessionCookieName, isValidEventCodeFormat } from "@/lib/eventCode";
import { errorCodeToMessage } from "@/lib/validation/fileValidation";

/**
 * STEP 2 of the guest upload flow — called after the browser has
 * successfully PUT the file bytes to R2 using the presigned URL from
 * request-url/route.ts.
 *
 * This is where the actual database row gets created, via the
 * insert_guest_photo() SECURITY DEFINER RPC (0003_functions.sql). That
 * function re-validates event status/limits itself (row-locked, so
 * concurrent confirms from many phones can't race past the event's
 * upload_limit), so this route stays a thin pass-through rather than
 * re-implementing validation that could drift out of sync with the DB.
 *
 * We use the admin client here (not the anon browser client) because
 * guests have no auth session at all — calling the RPC still goes
 * through the same security-definer logic regardless of which client
 * object issues the call; using the admin client here is purely about
 * having a stable server-side identity for the request, not about
 * bypassing the RPC's own checks.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventCode: rawEventCode, storagePath, originalFilename, fileSize, mimeType, width, height } =
      body as {
        eventCode?: string;
        storagePath?: string;
        originalFilename?: string;
        fileSize?: number;
        mimeType?: string;
        width?: number;
        height?: number;
      };

    if (!rawEventCode || !isValidEventCodeFormat(rawEventCode.toUpperCase())) {
      return NextResponse.json({ error: "Invalid event code." }, { status: 400 });
    }
    const eventCode = rawEventCode.toUpperCase();
    if (!storagePath || !fileSize || !mimeType) {
      return NextResponse.json({ error: "Missing upload details." }, { status: 400 });
    }
    // The session token is HttpOnly and event-scoped. Never accept it from the
    // request body, where a browser could replace it with a fresh identity.
    const guestSessionToken = request.cookies.get(guestSessionCookieName(eventCode))?.value;
    if (!guestSessionToken) {
      return NextResponse.json({ error: "Your upload session expired. Please reload and try again." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin.rpc("insert_guest_photo", {
      p_event_code: eventCode,
      p_storage_path: storagePath,
      p_original_filename: originalFilename ?? null,
      p_file_size: fileSize,
      p_mime_type: mimeType,
      p_guest_session_token: guestSessionToken,
      p_width: width ?? null,
      p_height: height ?? null,
    });

    if (error) {
      // Postgres raises our custom exception messages (EVENT_NOT_FOUND etc.)
      // as error.message — map them to guest-safe copy, never surface the
      // raw Postgres error to the browser (spec section 35).
      const code = error.message?.match(/[A-Z_]+/)?.[0] ?? "UNKNOWN";
      // 429 rather than 400: the guest did nothing wrong, they have simply
      // reached the limit the host set. The client shows the "you're done,
      // go see the gallery" path instead of a generic failure.
      const status = code === "GUEST_UPLOAD_LIMIT_REACHED" ? 429 : 400;
      return NextResponse.json({ error: errorCodeToMessage(code), code }, { status });
    }

    const photoId = (data as { photo_id: string }[] | null)?.[0]?.photo_id;

    // Note: image processing (gallery/thumb variants) happens asynchronously
    // via a DB webhook → Edge Function, triggered by this insert. The guest
    // does not wait for that — they get their "uploaded" confirmation now,
    // and the gallery will show the photo once processing completes
    // (typically a few seconds later). See supabase/functions/process-image.
    return NextResponse.json({ success: true, photoId });
  } catch (err) {
    console.error("upload confirm error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
