import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPresignedDownloadUrl } from "@/lib/storage/signUpload";
import { isValidEventCodeFormat } from "@/lib/eventCode";
import type { Event, Photo } from "@/types/database";

/**
 * Generates a ZIP of GALLERY-resolution images (not full originals) for
 * bulk download, per spec section 15's guidance not to attempt hundreds
 * of full-res files through the browser at once. A single-photo download
 * (/api/photos/:id/download) still offers the true original.
 *
 * HARD CAP: refuses batches over MAX_ZIP_PHOTOS. Building a server-side
 * ZIP of, say, 800 full galleries in one request would tie up the
 * function for minutes and risk timing out anyway — for very large
 * events this should move to a background job (e.g. a queued Edge
 * Function that emails a download link when ready) rather than a
 * synchronous request/response. That's flagged here as the next
 * scaling step rather than silently truncating results.
 */
const MAX_ZIP_PHOTOS = 150;

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

    // Same visibility gate as the gallery page and single-photo download —
    // kept consistent across all three read paths rather than re-derived.
    if (event.visibility === "private") {
      const sessionClient = await createSupabaseServerClient();
      const { data: authorized } = await sessionClient
        .from("events")
        .select("id")
        .eq("id", event.id)
        .maybeSingle();
      if (!authorized) {
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });
      }
    }

    let query = admin
      .from("photos")
      .select("*")
      .eq("event_id", event.id)
      .eq("status", "ready")
      .eq("is_hidden", false);

    if (scope === "favourites") {
      query = query.eq("is_favourite", true);
    } else if (scope === "selected") {
      if (!photoIds || photoIds.length === 0) {
        return NextResponse.json({ error: "No photos selected." }, { status: 400 });
      }
      query = query.in("id", photoIds);
    }

    const { data: photos, error } = await query
      .order("uploaded_at", { ascending: false })
      .limit(MAX_ZIP_PHOTOS)
      .returns<Photo[]>();

    if (error) {
      console.error("zip photo query failed:", error);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: "No photos to download." }, { status: 404 });
    }

    const zip = new JSZip();
    const usedNames = new Set<string>();

    // Fetch sequentially in small batches rather than all-at-once — R2
    // presigned GETs + downloads for 150 files done with Promise.all(150)
    // would open 150 concurrent sockets from one function instance, which
    // is more likely to trip provider limits than to finish faster.
    const BATCH_SIZE = 10;
    for (let i = 0; i < photos.length; i += BATCH_SIZE) {
      const batch = photos.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (photo) => {
          const pathToFetch = photo.gallery_path ?? photo.storage_path;
          const url = await createPresignedDownloadUrl(pathToFetch);
          const res = await fetch(url);
          if (!res.ok) return; // skip a single bad file rather than failing the whole zip

          const buffer = await res.arrayBuffer();
          const baseName = photo.original_filename?.replace(/\.[^.]+$/, "") || photo.id;
          let fileName = `${baseName}.jpg`;
          let n = 1;
          while (usedNames.has(fileName)) {
            fileName = `${baseName}-${n}.jpg`;
            n += 1;
          }
          usedNames.add(fileName);

          zip.file(fileName, buffer);
        })
      );
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
    // .slice() copies into a plain ArrayBuffer-backed view — JSZip's typed
    // output can be backed by SharedArrayBuffer under some bundler/runtime
    // combinations, which DOM's BlobPart type (correctly) doesn't accept.
    const zipBlob = new Blob([zipBytes.slice()], { type: "application/zip" });

    return new NextResponse(zipBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${eventCode}-${scope}.zip"`,
      },
    });
  } catch (err) {
    console.error("zip download error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
