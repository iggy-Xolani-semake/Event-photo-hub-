/**
 * Single source of truth for the storage layout described in spec
 * section 4. Every place that builds or parses an R2 key MUST go through
 * these functions — never string-concatenate a path inline elsewhere,
 * or the "never mix photographs between events" guarantee becomes only
 * as strong as the least careful call site.
 */

const SAFE_EVENT_CODE = /^[A-Z0-9]{6,12}$/;
const SAFE_EXTENSION = /^[a-z0-9]{2,5}$/;

export function assertSafeEventCode(eventCode: string): void {
  if (!SAFE_EVENT_CODE.test(eventCode)) {
    throw new Error(`Invalid event code format: ${eventCode}`);
  }
}

export function originalPath(eventCode: string, photoId: string, extension: string): string {
  assertSafeEventCode(eventCode);
  const ext = extension.toLowerCase().replace(/^\./, "");
  if (!SAFE_EXTENSION.test(ext)) throw new Error(`Invalid file extension: ${extension}`);
  return `events/${eventCode}/original/${photoId}.${ext}`;
}

export function galleryPath(eventCode: string, photoId: string): string {
  assertSafeEventCode(eventCode);
  return `events/${eventCode}/gallery/${photoId}.webp`;
}

export function thumbnailPath(eventCode: string, photoId: string): string {
  assertSafeEventCode(eventCode);
  return `events/${eventCode}/thumb/${photoId}.webp`;
}

/** Extracts the event code embedded in a storage path, for defense-in-depth checks. */
export function eventCodeFromPath(path: string): string | null {
  const match = path.match(/^events\/([A-Z0-9]{6,12})\//);
  return match?.[1] ?? null;
}

export const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const ALLOWED_MIME_TYPES = Object.keys(MIME_TO_EXTENSION);
