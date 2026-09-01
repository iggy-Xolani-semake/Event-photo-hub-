import "server-only";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createR2Client, R2_BUCKET } from "./r2Client";

const UPLOAD_URL_TTL_SECONDS = 120; // short-lived: enough for one mobile upload, not reusable later
const DOWNLOAD_URL_TTL_SECONDS = 3600; // 1 hour, for client "download original" links

/**
 * Generates a presigned PUT URL scoped to exactly one object key, one
 * content-type, and one expiry. The browser gets this URL and nothing
 * else — no R2 credentials ever touch client JavaScript. Because the key
 * is fixed server-side (via lib/storage/paths.ts, after the caller has
 * already validated the event via get_event_for_upload), a guest cannot
 * redirect their upload into another event's prefix by tampering with
 * the request: the key isn't a parameter they control, it's baked into
 * the signature.
 */
export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  maxSizeBytes: number;
}): Promise<{ uploadUrl: string; key: string }> {
  const client = createR2Client();

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: params.key,
    ContentType: params.contentType,
    // R2 (S3-compatible) enforces this as an exact content-length match
    // is NOT possible via presigned URL conditions the same way POST
    // policies allow — so max size is enforced by the API route reading
    // the actual upload buffer/stream length BEFORE issuing the URL in
    // the direct-upload-via-server variant, and is enforced again by the
    // insert_guest_photo() RPC check against file_size. Belt and braces.
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });

  return { uploadUrl, key: params.key };
}

export async function createPresignedDownloadUrl(key: string): Promise<string> {
  const client = createR2Client();
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
}
