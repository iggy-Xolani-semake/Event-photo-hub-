// Supabase Edge Function (Deno runtime).
//
// Triggered by a Database Webhook on INSERT into public.photos (configure
// this in the Supabase dashboard: Database → Webhooks → new webhook,
// table=photos, event=INSERT, type=Edge Function, target=process-image).
// See supabase/README.md for the exact setup steps.
//
// Flow:
//   1. Receives the new photo row (event_id, storage_path, mime_type, id)
//   2. Downloads the original from R2
//   3. Resizes to gallery (~1600px longest edge, WebP, quality ~80) and
//      thumbnail (~400px longest edge, WebP, quality ~70) variants
//   4. Uploads both variants back to R2 under the event's gallery/ and
//      thumb/ prefixes
//   5. Calls mark_photo_processed() to flip status → 'ready' and record
//      the new paths
//
// This runs once per uploaded photo (event-driven, not a batch job) —
// which is what lets 15-500 concurrent guest uploads scale horizontally:
// each triggers its own independent, short-lived function invocation
// rather than all competing for one shared worker queue.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { decode as decodeImage, Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID")!;
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
const R2_BUCKET_NAME = Deno.env.get("R2_BUCKET_NAME")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PROCESS_IMAGE_WEBHOOK_SECRET = Deno.env.get("PROCESS_IMAGE_WEBHOOK_SECRET");

const GALLERY_MAX_DIMENSION = 1600;
const THUMB_MAX_DIMENSION = 400;
const GALLERY_QUALITY = 80;
const THUMB_QUALITY = 70;

interface PhotoRow {
  id: string;
  event_id: string;
  storage_path: string;
  mime_type: string;
}

interface WebhookPayload {
  type: "INSERT";
  table: "photos";
  record: PhotoRow;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index]! ^ rightBytes[index]!;
  }
  return difference === 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isOriginalPath(value: unknown): value is string {
  return typeof value === "string" &&
    /^events\/[A-Z0-9]{6,12}\/original\/[^/]+\.(?:jpg|jpeg|png|heic|heif)$/i.test(value);
}

function eventCodeFromOriginalPath(path: string): string {
  const match = path.match(/^events\/([A-Z0-9]{6,12})\/original\//);
  if (!match?.[1]) throw new Error("Invalid original storage path");
  return match[1];
}

function galleryPath(eventCode: string, photoId: string): string {
  return `events/${eventCode}/gallery/${photoId}.webp`;
}

function thumbnailPath(eventCode: string, photoId: string): string {
  return `events/${eventCode}/thumb/${photoId}.webp`;
}

Deno.serve(async (req) => {
  let photo: PhotoRow | undefined;
  try {
    if (!PROCESS_IMAGE_WEBHOOK_SECRET) {
      console.error("PROCESS_IMAGE_WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Function is not configured" }), { status: 503 });
    }
    const suppliedSecret = req.headers.get("x-process-image-secret");
    if (!suppliedSecret || !constantTimeEqual(suppliedSecret, PROCESS_IMAGE_WEBHOOK_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const payload = (await req.json()) as Partial<WebhookPayload>;
    if (payload.type !== "INSERT" || payload.table !== "photos" || !payload.record) {
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), { status: 400 });
    }
    const payloadPhoto = payload.record;
    if (!isUuid(payloadPhoto.id) || !isOriginalPath(payloadPhoto.storage_path)) {
      return new Response(JSON.stringify({ error: "Invalid photo record" }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: canonicalPhoto, error: photoLookupError } = await supabase
      .from("photos")
      .select("id, event_id, storage_path, mime_type")
      .eq("id", payloadPhoto.id)
      .maybeSingle<PhotoRow>();
    if (photoLookupError) throw photoLookupError;
    if (!canonicalPhoto || canonicalPhoto.storage_path !== payloadPhoto.storage_path) {
      return new Response(JSON.stringify({ error: "Photo record mismatch" }), { status: 409 });
    }
    photo = canonicalPhoto;

    // The DB row is authoritative. The payload cannot choose an event,
    // source object, bucket, or destination object.
    const eventCode = eventCodeFromOriginalPath(canonicalPhoto.storage_path);
    const canonicalGalleryPath = galleryPath(eventCode, canonicalPhoto.id);
    const canonicalThumbnailPath = thumbnailPath(eventCode, canonicalPhoto.id);

    const originalBytes = await downloadFromR2(canonicalPhoto.storage_path);
    const decoded = await decodeImage(originalBytes);

    // imagescript's decode() returns Image | GIF frames; guard for the
    // single-frame case we expect from a phone camera photo.
    const image = decoded instanceof Image ? decoded : decoded[0];

    const galleryBuffer = await resizeToWebp(image, GALLERY_MAX_DIMENSION, GALLERY_QUALITY);
    const thumbBuffer = await resizeToWebp(image, THUMB_MAX_DIMENSION, THUMB_QUALITY);

    await Promise.all([
      uploadToR2(canonicalGalleryPath, galleryBuffer, "image/webp"),
      uploadToR2(canonicalThumbnailPath, thumbBuffer, "image/webp"),
    ]);

    const { error } = await supabase.rpc("mark_photo_processed", {
      p_photo_id: canonicalPhoto.id,
      p_gallery_path: canonicalGalleryPath,
      p_thumbnail_path: canonicalThumbnailPath,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, photoId: photo.id }), { status: 200 });
  } catch (err) {
    console.error("process-image failed:", err);

    // Mark the row as failed so it's no longer indistinguishable from
    // "still processing" in the admin/gallery UI. Best-effort: if this
    // itself fails (e.g. payload was malformed enough that photo.id
    // never existed), there's nothing more useful to do than log it —
    // we still return 200 either way (see note below).
    if (photo?.id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.rpc("mark_photo_failed", {
          p_photo_id: photo.id,
          p_error_message: String(err).slice(0, 500),
        });
      } catch (markErr) {
        console.error("Additionally failed to mark photo as failed:", markErr);
      }
    }

    // Deliberately return 200 here after logging: Supabase webhooks retry
    // on non-2xx, and a permanently-malformed image (corrupt upload) would
    // otherwise retry forever. The photo row is now marked 'failed' above,
    // which the gallery/admin UI surfaces distinctly from "still
    // processing" — see the failedCount notice on the admin event page.
    return new Response(JSON.stringify({ error: String(err) }), { status: 200 });
  }
});

async function downloadFromR2(key: string): Promise<Uint8Array> {
  const url = await signedR2Url(key, "GET");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${key}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function uploadToR2(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const url = await signedR2Url(key, "PUT", contentType);
  const res = await fetch(url, { method: "PUT", body, headers: { "Content-Type": contentType } });
  if (!res.ok) throw new Error(`Failed to upload ${key}: ${res.status}`);
}

async function resizeToWebp(image: Image, maxDimension: number, quality: number): Promise<Uint8Array> {
  const clone = image.clone();
  if (clone.width > maxDimension || clone.height > maxDimension) {
    if (clone.width >= clone.height) {
      clone.resize(maxDimension, Image.RESIZE_AUTO);
    } else {
      clone.resize(Image.RESIZE_AUTO, maxDimension);
    }
  }
  return await clone.encode(1, { quality }); // format 1 = WebP in imagescript
}

// Minimal SigV4 presigning for R2, done inline (Deno edge runtime has no
// AWS SDK available by default). Kept intentionally small — this function
// only ever needs GET (download original) and PUT (upload variant).
async function signedR2Url(key: string, method: "GET" | "PUT", contentType?: string): Promise<string> {
  const { AwsClient } = await import("https://esm.sh/aws4fetch@1.0.20");
  const client = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;
  const signed = await client.sign(endpoint, {
    method,
    headers: contentType ? { "Content-Type": contentType } : {},
    aws: { signQuery: true },
  });
  return signed.url;
}
