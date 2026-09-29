/**
 * The words guests are shown about their own photos, kept in one place.
 *
 * Two rules, both deliberate:
 *
 *   1. Guests are told, in plain language, that the originals are the event
 *      creator's to download — not theirs. The server already enforces exactly
 *      that (see `decideDownloadEntitlement` in `src/lib/auth/downloadEntitlement.ts`;
 *      a guest asking for an original gets 403), so this is the copy catching
 *      up with the behaviour rather than a new restriction.
 *   2. Nothing here claims a photo did or didn't reach the guest's camera roll.
 *      It depends on the platform (iOS Safari hands a `capture="environment"`
 *      shot straight to the page without saving it to Photos; the Android
 *      camera app usually keeps its own copy), so we invite the guest to save
 *      instead of asserting what happened.
 */

/** The promise the product makes; repeated verbatim wherever guests look. */
export const GUEST_CANNOT_DOWNLOAD_NOTE =
  "Only the event creator can download the original photos — guests can view and favourite them, but not download them.";

/** The offer that pairs with it: the guest keeps their own copy. */
export const GUEST_KEEP_COPY_NOTE =
  "You can save your own full-quality copies to your phone right after they upload.";

/** Heading used by the explainer block on the upload start screen. */
export const PHOTO_RIGHTS_HEADING = "What happens to your photos";
