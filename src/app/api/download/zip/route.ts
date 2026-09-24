import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveDownloadEntitlement } from "@/lib/auth/downloadEntitlement";
import { createPresignedDownloadUrl } from "@/lib/storage/signUpload";
import { isValidEventCodeFormat } from "@/lib/eventCode";
import type { DownloadManifestFile, DownloadManifestPart } from "@/lib/download/types";
import type { Event, Photo } from "@/types/database";

const MAX_ZIP_PHOTOS = 1000;
const ZIP_PART_TARGET_BYTES = 150 * 1024 * 1024;

/**
 * Returns a manifest only. Photo bytes never pass through the server.
 *
 * The browser uses the short-lived original URLs to build one ZIP64 archive
 * per approximately 150 MB part. Keeping the parts small makes the fallback
 * viable on iOS Safari and prevents a multi-gigabyte Blob from being built.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventCode, scope, photoIds } = body as {
      eventCode?: string;
      scope?: "all" | "favourites" | "selected";
      photoIds?: string[];
    };

    if (!eventCode || !isValidEventCodeFormat(eventCode)) {
      return NextResponse.json({ error: "Invalid event code." }, { status: 400 });
    }
    if (!scope || !["all", "favourites", "selected"].includes(scope)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: event } = await admin
      .from("events")
      .select("*")
      .eq("event_code", eventCode)
      .maybeSingle<Event>();

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const entitlement = await resolveDownloadEntitlement(event.id);
    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          error:
            entitlement.reason === "unpaid_owner"
              ? "Downloads unlock once this event's package has been paid for."
              : "Not authorized.",
        },
        { status: entitlement.reason === "unpaid_owner" ? 402 : 403 }
      );
    }

    let query = admin
      .from("photos")
      .select("id, original_filename, storage_path, file_size, mime_type")
      .eq("event_id", event.id)
      .eq("status", "ready")
      .eq("is_hidden", false);

    if (scope === "favourites") {
      query = query.eq("is_favourite", true);
    } else if (scope === "selected") {
      if (!photoIds || photoIds.length === 0 || photoIds.length > MAX_ZIP_PHOTOS) {
        return NextResponse.json({ error: "Invalid photo selection." }, { status: 400 });
      }
      query = query.in("id", photoIds);
    }

    const { data: photos, error } = await query
      .order("uploaded_at", { ascending: false })
      .limit(MAX_ZIP_PHOTOS + 1)
      .returns<Pick<Photo, "id" | "original_filename" | "storage_path" | "file_size" | "mime_type">[]>();

    if (error) {
      console.error("download manifest query failed:", error);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: "No photos to download." }, { status: 404 });
    }
    if (photos.length > MAX_ZIP_PHOTOS) {
      return NextResponse.json(
        { error: `This download is larger than the ${MAX_ZIP_PHOTOS}-photo limit. Select a smaller batch.` },
        { status: 413 }
      );
    }

    const usedNames = new Set<string>();
    const files: DownloadManifestFile[] = await Promise.all(
      photos.map(async (photo) => {
        const name = uniqueDownloadName(photo.original_filename, photo.id, photo.mime_type, usedNames);
        return {
          id: photo.id,
          name,
          url: await createPresignedDownloadUrl(photo.storage_path),
          size: photo.file_size,
        };
      })
    );

    const parts: DownloadManifestPart[] = [];
    let current: DownloadManifestFile[] = [];
    let currentBytes = 0;

    for (const file of files) {
      if (current.length > 0 && currentBytes + file.size > ZIP_PART_TARGET_BYTES) {
        parts.push({
          part: parts.length + 1,
          totalParts: 0,
          estimatedBytes: currentBytes,
          files: current,
        });
        current = [];
        currentBytes = 0;
      }
      current.push(file);
      currentBytes += file.size;
    }
    if (current.length > 0) {
      parts.push({
        part: parts.length + 1,
        totalParts: 0,
        estimatedBytes: currentBytes,
        files: current,
      });
    }

    const totalParts = parts.length;
    for (const part of parts) part.totalParts = totalParts;

    return NextResponse.json({
      eventCode,
      scope,
      targetPartBytes: ZIP_PART_TARGET_BYTES,
      parts,
    });
  } catch (err) {
    console.error("download manifest error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

function uniqueDownloadName(
  originalFilename: string | null,
  photoId: string,
  mimeType: string,
  usedNames: Set<string>
): string {
  const fallbackExtension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const raw = originalFilename?.trim() || `${photoId}.${fallbackExtension}`;
  const cleaned = raw.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 160) || photoId;
  const dot = cleaned.lastIndexOf(".");
  const base = dot > 0 ? cleaned.slice(0, dot) : cleaned;
  const extension = dot > 0 ? cleaned.slice(dot) : `.${fallbackExtension}`;

  let candidate = `${base}${extension}`;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base}-${suffix}${extension}`;
    suffix += 1;
  }
  usedNames.add(candidate);
  return candidate;
}
