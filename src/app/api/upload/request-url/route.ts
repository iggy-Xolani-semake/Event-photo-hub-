import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createPresignedUploadUrl } from "@/lib/storage/signUpload";
import { originalPath, MIME_TO_EXTENSION, ALLOWED_MIME_TYPES } from "@/lib/storage/paths";
import { validateFile } from "@/lib/validation/fileValidation";
import { isValidEventCodeFormat } from "@/lib/eventCode";
import { randomUUID } from "crypto";
import type { EventForUpload } from "@/types/database";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * STEP 1 of the guest upload flow.
 *
 * Guest → this route (event_code, file metadata)
 *       → we resolve event_code via get_event_for_upload() RPC (never
 *         trust an event_id if the client sent one)
 *       → we validate file type/size against THIS event's configured
 *         limits (spec section 6: admin-configurable)
 *       → we generate a photo id + storage key ourselves (never accept
 *         a client-supplied storage path)
 *       → we return a short-lived presigned PUT URL scoped to that key
 *
 * The browser then PUTs the file bytes directly to R2 using that URL
 * (see STEP 2 in /api/upload/confirm/route.ts for what happens after).
 * This keeps large file bytes off our own server compute entirely, while
 * still never exposing real R2 credentials to the browser.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventCode, fileSize, mimeType } = body as {
      eventCode?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      uploaderIdentifier?: string;
    };

    if (!eventCode || typeof eventCode !== "string" || !isValidEventCodeFormat(eventCode)) {
      return NextResponse.json({ error: "Invalid event code." }, { status: 400 });
    }
    if (!fileSize || !mimeType) {
      return NextResponse.json({ error: "Missing file metadata." }, { status: 400 });
    }

    // Rate limiting (spec section 24) — keyed by event code + IP, generous
    // enough for a genuine guest uploading 10 photos in a burst, tight
    // enough to blunt scripted abuse of the public endpoint.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateCheck = checkRateLimit(`upload:${eventCode}:${ip}`, {
      windowMs: 60_000,
      maxRequests: 30,
    });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many upload requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const admin = createSupabaseAdminClient();

    // Resolve + validate the event server-side. This RPC is the same one
    // the guest page itself calls to render event name/date, so "closed"
    // / "not found" / "limit reached" are handled consistently in one
    // place rather than re-implemented per route.
    const { data: eventRows, error: eventError } = await admin.rpc("get_event_for_upload", {
      p_event_code: eventCode,
    });

    if (eventError) {
      console.error("get_event_for_upload failed:", eventError);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    const eventInfo = (eventRows as EventForUpload[] | null)?.[0];

    if (!eventInfo || !eventInfo.can_upload || !eventInfo.event_id) {
      const message =
        eventInfo?.reason === "closed"
          ? "This event is no longer accepting photographs."
          : eventInfo?.reason === "limit_reached"
            ? "This event has reached its photo limit."
            : eventInfo?.reason === "archived"
              ? "This event is no longer available."
              : "We couldn't find this event. Please check the link or QR code.";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const maxFileSize = eventInfo.max_file_size_bytes ?? 15 * 1024 * 1024;
    const fileValidation = validateFile({ size: fileSize, type: mimeType }, maxFileSize);
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.message }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      return NextResponse.json({ error: "This file type isn't supported." }, { status: 400 });
    }

    // We mint the photo id and storage key ourselves — the client never
    // gets to choose where its bytes land.
    const photoId = randomUUID();
    const extension = MIME_TO_EXTENSION[mimeType.toLowerCase()] ?? "jpg";
    const key = originalPath(eventCode, photoId, extension);

    const { uploadUrl } = await createPresignedUploadUrl({
      key,
      contentType: mimeType,
      maxSizeBytes: maxFileSize,
    });

    return NextResponse.json({
      photoId,
      uploadUrl,
      storagePath: key,
      // Echoed back so the confirm step doesn't need to re-derive it.
      eventId: eventInfo.event_id,
    });
  } catch (err) {
    console.error("request-url error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
