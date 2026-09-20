import "server-only";
import { S3Client, DeleteObjectsCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 is S3-compatible, so we use the AWS SDK pointed at R2's
 * account-scoped endpoint. This client is server-only — R2_ACCESS_KEY_ID
 * and R2_SECRET_ACCESS_KEY must never reach the browser. All browser
 * uploads go through a short-lived PRESIGNED URL generated server-side
 * (see signUpload.ts), never through a client holding real R2 credentials.
 */
export function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials are not configured. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in your environment."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "event-photo-hub";

/**
 * Deletes up to 1000 objects in one request (S3/R2 batch-delete limit).
 * Used when an admin deletes a photo — removes original, gallery, and
 * thumbnail together so deleting the database row doesn't leave orphaned
 * files silently accumulating storage cost in R2.
 */
export async function deleteFromR2(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const client = createR2Client();
  await client.send(
    new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    })
  );
}

export async function getR2ObjectMetadata(
  key: string
): Promise<{ contentLength: number; contentType: string | null }> {
  const client = createR2Client();
  const response = await client.send(
    new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );

  if (response.ContentLength === undefined) {
    throw new Error("Uploaded object did not include a content length.");
  }

  return {
    contentLength: response.ContentLength,
    contentType: response.ContentType?.toLowerCase() ?? null,
  };
}
