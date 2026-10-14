import { createHash, timingSafeEqual } from "node:crypto";

export type PayFastEntry = readonly [string, string];

/** PayFast uses PHP-style application/x-www-form-urlencoded encoding. */
export function encodePayFastValue(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");
}

/** Preserve PayFast's posted field order when constructing a signature string. */
export function payFastParameterString(entries: Iterable<PayFastEntry>, includeSignature = false): string {
  const parts: string[] = [];
  for (const [key, value] of entries) {
    if (!includeSignature && key === "signature") continue;
    if (value === "") continue;
    parts.push(`${key}=${encodePayFastValue(value)}`);
  }
  return parts.join("&");
}

export function payFastSignature(entries: Iterable<PayFastEntry>, passphrase: string): string {
  const parameterString = payFastParameterString(entries);
  const salted = `${parameterString}&passphrase=${encodePayFastValue(passphrase)}`;
  return createHash("md5").update(salted, "utf8").digest("hex");
}

export function secureStringEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left.toLowerCase(), "utf8");
  const rightBytes = Buffer.from(right.toLowerCase(), "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function payFastHost(mode: string | undefined): "sandbox.payfast.co.za" | "www.payfast.co.za" {
  return mode?.toLowerCase() === "sandbox" ? "sandbox.payfast.co.za" : "www.payfast.co.za";
}

export function payFastAmountMatches(expectedCents: number, receivedAmount: string): boolean {
  const received = Number(receivedAmount);
  return Number.isFinite(received) && Math.abs(expectedCents / 100 - received) <= 0.01;
}
