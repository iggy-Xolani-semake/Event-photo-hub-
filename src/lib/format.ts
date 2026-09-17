/**
 * Formats a Postgres `date` column ("2026-09-16") for guest-facing screens.
 * Parsed as a LOCAL date (T00:00:00) rather than letting `new Date("2026-09-16")`
 * treat it as UTC midnight, which renders as the previous day for anyone
 * east of Greenwich — i.e. every guest in South Africa.
 */
export function formatEventDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
