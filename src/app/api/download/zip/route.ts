import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveDownloadEntitlement } from "@/lib/auth/downloadEntitlement";
import { createPresignedDownloadUrl } from "@/lib/storage/signUpload";
import { isValidEventCodeFormat } from "@/lib/eventCode";
import type { Event, Photo } from "@/types/database";

/**
 * Generates a ZIP of GALLERY-resolution images (not full originals) for
 * bulk download, per spec section 15's guidance not to attempt hundreds
 * of full-res files through the browser at once. A single-photo download
 * (/api/photos/:id/download) still offers the true original.
 *
 * HARD CAP: refuses batches over MAX_ZIP_PHOTOS. The package catalog tops
 * out at 1000 photos, so this supports every currently sellable tier while
 * still refusing an unbounded request that could exhaust function memory.
 * scaling step rather than silently truncating results.
 */
const MAX_ZIP_PHOTOS = 1000;

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

    // Entitlement gate, identical to the single-photo route: the gallery is
    // free to look at, bulk downloads belong to the host once they have paid.
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
      .limit(MAX_ZIP_PHOTOS + 1)
      .returns<Photo[]>();

    if (error) {
      console.error("zip photo query failed:", error);
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
