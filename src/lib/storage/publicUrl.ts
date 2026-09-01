/**
 * Gallery and thumbnail variants are served from R2's public bucket
 * domain (either R2.dev or a custom domain you attach) because they're
 * displayed in bulk in a masonry grid — presigning hundreds of thumbnail
 * URLs per page load would be needless overhead for images that carry no
 * sensitive original-quality data anyway.
 *
 * ORIGINALS ARE DIFFERENT: the original/ prefix must NOT be public. Only
 * expose originals via createPresignedDownloadUrl() (short-lived, server-
 * issued) — see lib/storage/signUpload.ts and the /api/photos/:id/download
 * route. This split is what lets a "private" event still serve its own
 * gallery images cheaply while keeping full-resolution download access
 * gated behind an authorization check.
 *
 * If you want gallery/thumb private too (e.g. a strictly "private"
 * visibility event), swap this for a presigned GET the same way
 * downloads work — the schema and paths don't change, just this function.
 */
export function publicImageUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  const host = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST;
  if (!host) {
    console.warn("NEXT_PUBLIC_R2_PUBLIC_HOST is not configured — gallery images will not load.");
    return null;
  }
  return `https://${host}/${storagePath}`;
}
