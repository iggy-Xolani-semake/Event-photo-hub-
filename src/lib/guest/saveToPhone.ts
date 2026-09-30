/**
 * Writing a guest's own originals back to their phone.
 *
 * Why this exists: `<input capture="environment">` on iOS Safari opens the
 * camera directly and hands the shot to the page *without* adding it to
 * Photos. The guest's only copy is then on our server, and if they close the
 * tab the file is gone from the device entirely. `UploadItem.file` is kept in
 * memory until the guest leaves the success screen, so that screen offers to
 * put the originals back where they belong.
 *
 * Two mechanisms, in the order they actually work on phones:
 *
 *   1. Web Share Level 2 (`navigator.share({ files })`) — on iOS this is the
 *      only reliable route into Photos: the share sheet has a "Save Image"
 *      action. Android Chrome and Safari 15+ support it too.
 *   2. One download per file — honest on desktop and Android Chrome; on iOS
 *      Safari the `download` attribute is ignored, so the image opens in a
 *      tab and has to be long-pressed. Hence it is the fallback, not the
 *      primary.
 *
 * The decision is a pure function so it can be tested without a browser; the
 * three thin wrappers below are the only parts that touch `navigator`.
 */

export type SaveStrategy =
  /** One share sheet containing every file. */
  | "share"
  /** A share sheet per file — some platforms refuse a multi-file payload. */
  | "share-each"
  /** Anchor-per-file download. */
  | "download";

/**
 * Pick the best available route.
 *
 * `canShare` is injected rather than read from `navigator` so the matrix can be
 * asserted in Node. Callers pass `canShareFiles` below.
 */
export function pickSaveStrategy(
  files: File[],
  canShare: (files: File[]) => boolean
): SaveStrategy {
  if (files.length === 0) return "download";
  if (canShare(files)) return "share";
  // Platforms that accept one file but not a batch (notably some iOS versions
  // with a mixed set) still beat the download path.
  if (canShare(files.slice(0, 1))) return "share-each";
  return "download";
}

/**
 * Can this browser share these exact files?
 *
 * `navigator.canShare` is allowed to throw (it validates the payload), and it
 * does not exist at all on desktop Safari, so both cases are "no".
 */
export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  if (files.length === 0) return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

/** Did the guest close the share sheet themselves? Not an error. */
export function isShareCancellation(error: unknown): boolean {
  return typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError";
}

/** Open one share sheet for the given files. Rejects on cancel or failure. */
export function shareFiles(files: File[], title: string): Promise<void> {
  return navigator.share({ files, title });
}

/**
 * Share files one at a time, stopping at the first refusal that is not the
 * guest cancelling.
 *
 * `onShared` is reported as each sheet opens, not just at the end: if sharing
 * fails halfway the caller has to know how many files already went out, and on
 * a cancellation the return value never arrives because the error propagates.
 */
export async function shareFilesOneByOne(
  files: File[],
  title: string,
  onShared?: (sharedCount: number) => void
): Promise<number> {
  let shared = 0;
  for (const file of files) {
    try {
      await shareFiles([file], title);
      shared += 1;
      onShared?.(shared);
    } catch (error) {
      if (isShareCancellation(error)) throw error; // the guest said stop
      break;
    }
  }
  return shared;
}

/**
 * Trigger a download per file. Returns how many anchors were clicked.
 *
 * Object URLs are revoked on a timer rather than immediately: Safari cancels a
 * download whose URL disappears in the same tick, and the blob stays alive
 * until the navigation has been handled.
 */
export function downloadFiles(files: File[]): number {
  let started = 0;
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name || "shutaMzala-photo.jpg";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    started += 1;
  }
  return started;
}
