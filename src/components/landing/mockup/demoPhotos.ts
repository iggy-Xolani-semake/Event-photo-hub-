import { DEMO_PHOTO_BLUR } from "./demoPhotoBlur";

/**
 * The photography behind the landing-page mockups.
 *
 * ## Why these are local files (Option B), not Unsplash URLs (Option A)
 *
 * The hero and the gallery grids used to render CSS gradient chips. They now
 * render real event photographs from `/public/images/demo/*.webp`:
 *
 *   1. `next/image` optimization happens on the *server* (`/_next/image`).
 *      Pointing it at images.unsplash.com makes the app depend on a
 *      third-party host being reachable from wherever the server runs — in
 *      a locked-down sandbox or an offline build that is a red box with a
 *      broken-image icon, not a wedding photo. Local files are optimized by
 *      the same pipeline with nothing to fetch.
 *   2. No hotlinking, no rate limits, no surprise 404s when a photo is
 *      removed upstream, and the photos ship with the deploy.
 *
 * Swapping to remote URLs later is a one-line-per-photo change: replace
 * `src` with the Unsplash URL, keep everything else. `images.remotePatterns`
 * in next.config.ts already allows images.unsplash.com.
 *
 * ## Crops
 *
 * Every photo is a 16:9 frame that gets centre-cropped into a square tile, so
 * each entry carries the `objectPosition` that keeps the subject in frame and
 * an optional `flip` for the couple of frames that appear twice in the
 * twelve-tile gallery (three new photos arrive during the demo cycle, which
 * leaves nine slots for seven pre-existing shots).
 */

export interface DemoPhoto {
  /** Public path of the WebP, straight into next/image. */
  src: string;
  /** True text alternative. Mockup tiles pass "" instead — they are decoration. */
  alt: string;
  /** `object-position`, i.e. which part of the frame survives the square crop. */
  position?: string;
  /** Mirror the frame so a repeat crop doesn't read as the same shot. */
  flip?: boolean;
  /** Data-URL smear shown while the real frame decodes. */
  blurDataURL: string;
}

function photo(
  name: keyof typeof DEMO_PHOTO_BLUR,
  alt: string,
  position?: string,
  flip?: boolean
): DemoPhoto {
  return {
    src: `/images/demo/${name}.webp`,
    alt,
    position,
    flip,
    blurDataURL: DEMO_PHOTO_BLUR[name] ?? "",
  };
}

// ---------------------------------------------------------------------------
// The ten photographs
// ---------------------------------------------------------------------------
const FIRST_DANCE = photo(
  "gallery-01",
  "Bride and groom sharing their first dance under festoon lights",
  "50% 32%"
);
const SPARKLERS = photo(
  "gallery-02",
  "Guests holding sparklers in a row at the end of an evening wedding",
  "50% 38%"
);
const TOAST = photo(
  "gallery-03",
  "Hands raising champagne glasses in a toast at the reception",
  "50% 42%"
);
const DANCE_FLOOR = photo(
  "gallery-04",
  "Guests dancing under purple and blue party lights",
  "50% 40%"
);
const GROUP_SELFIE = photo(
  "gallery-05",
  "Four friends taking a selfie together at the party",
  "50% 42%"
);
const CAKE = photo("gallery-06", "Wedding cake lit by candles and fairy lights", "50% 42%");
const BANQUET = photo(
  "gallery-07",
  "Long banquet table set with candles and flowers at dusk",
  "50% 50%"
);
const BRIDESMAIDS = photo(
  "gallery-08",
  "Bride walking through the garden with her bridesmaids at golden hour",
  "50% 40%"
);
const PHONES_UP = photo(
  "gallery-09",
  "Seated guests holding up their phones to photograph the ceremony",
  "50% 45%"
);
const CONFETTI = photo(
  "gallery-10",
  "Guests laughing under falling golden confetti on the dance floor",
  "50% 40%"
);

/**
 * The three photos the guest uploads on the phone mockup. They are the first
 * three in the camera roll, and they are the last three tiles in the host
 * gallery — so the phone's selection and the gallery's "just added" row are
 * the same photographs, not two unrelated sets of stock art.
 */
export const UPLOAD_BATCH: readonly DemoPhoto[] = [GROUP_SELFIE, CONFETTI, SPARKLERS];

/** The guest's camera roll in the picker: the upload batch first, then the
 *  rest of the event they have already shot, then a couple of pre-existing
 *  gallery frames so the grid reads like a real roll rather than a curated
 *  gallery. */
export const CAMERA_ROLL: readonly DemoPhoto[] = [
  ...UPLOAD_BATCH,
  FIRST_DANCE,
  TOAST,
  DANCE_FLOOR,
  CAKE,
  BRIDESMAIDS,
  BANQUET,
];

/** The host gallery: what a wedding looks like after a night of guest
 *  uploads. Last three = the batch arriving during the demo cycle. */
export const HERO_GALLERY: readonly DemoPhoto[] = [
  FIRST_DANCE,
  PHONES_UP,
  TOAST,
  DANCE_FLOOR,
  CAKE,
  BANQUET,
  BRIDESMAIDS,
  { ...DANCE_FLOOR, position: "32% 62%", flip: true },
  { ...BANQUET, position: "68% 45%", flip: true },
  ...UPLOAD_BATCH,
];

/** One photo per feature card, picked to illustrate the mechanism. */
export const FEATURE_PHOTOS: Readonly<Record<string, DemoPhoto>> = {
  onboarding: PHONES_UP,
  performance: DANCE_FLOOR,
  control: BANQUET,
  downloads: FIRST_DANCE,
};

/** A dim, warm room used behind the phone's viewfinder in the scan step. */
export const CAMERA_BACKDROP: DemoPhoto = BANQUET;

/** Wraps around, so a caller can index freely without bounds checks. */
export function galleryPhoto(index: number): DemoPhoto {
  return HERO_GALLERY[index % HERO_GALLERY.length] ?? FIRST_DANCE;
}

export function cameraRollPhoto(index: number): DemoPhoto {
  return CAMERA_ROLL[index % CAMERA_ROLL.length] ?? FIRST_DANCE;
}

export function uploadBatchPhoto(index: number): DemoPhoto {
  return UPLOAD_BATCH[index % UPLOAD_BATCH.length] ?? GROUP_SELFIE;
}
