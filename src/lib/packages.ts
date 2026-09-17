import type { Package } from "@/types/database";

/** Formats 5000 as "R50" / "R1 250". Null stays null: unpriced is not free. */
export function formatPrice(priceCents: number | null, currency = "ZAR"): string | null {
  if (priceCents === null || priceCents === undefined) return null;
  const symbol = currency === "ZAR" ? "R" : `${currency} `;
  return `${symbol}${(priceCents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;
}

export function isForSale(pkg: Package): boolean {
  return pkg.is_active && pkg.price_cents !== null && pkg.price_cents > 0;
}

/**
 * Caps a requested limit by the package the event is on.
 *
 * The database enforces the same rule (protect_event_commercial_fields in
 * 0006), so this is not the security boundary — it exists to give the client
 * a readable message before the request is made, and to keep the API's
 * behaviour identical whether or not the trigger is present.
 */
export function packageCeilingError(
  pkg: { photo_limit: number; max_file_size_bytes: number; max_files_per_upload: number; name: string },
  requested: { uploadLimit: number; maxFileSizeMb: number; maxFilesPerUpload: number }
): string | null {
  if (requested.uploadLimit > pkg.photo_limit) {
    return `Your ${pkg.name} package holds ${pkg.photo_limit} photos. Upgrade to raise that.`;
  }
  if (requested.maxFileSizeMb * 1024 * 1024 > pkg.max_file_size_bytes) {
    const mb = Math.round(pkg.max_file_size_bytes / (1024 * 1024));
    return `Your ${pkg.name} package accepts photos up to ${mb} MB.`;
  }
  if (requested.maxFilesPerUpload > pkg.max_files_per_upload) {
    return `Your ${pkg.name} package allows ${pkg.max_files_per_upload} photos per upload.`;
  }
  return null;
}
