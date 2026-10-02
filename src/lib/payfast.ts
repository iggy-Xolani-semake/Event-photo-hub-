import "server-only";

import { createHash } from "crypto";

const SANDBOX_HOST = "sandbox.payfast.co.za";
const LIVE_HOST = "www.payfast.co.za";

/** PayFast's custom-payment signature uses PHP urlencode semantics. */
function payFastEncode(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%20/g, "+");
}

/**
 * Generate the custom-payment MD5 signature.
 *
 * PayFast custom payments are signed in the exact field order submitted,
 * unlike the separate PayFast API signature which sorts fields alphabetically.
 */
export function generatePayFastSignature(
  entries: readonly (readonly [string, string])[],
  passphrase?: string,
): string {
  const parts = entries
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${payFastEncode(value)}`);

  if (passphrase?.trim()) {
    parts.push(`passphrase=${payFastEncode(passphrase)}`);
  }

  return createHash("md5").update(parts.join("&"), "utf8").digest("hex");
}

export function payFastHost(mode: string | undefined): string {
  return mode === "live" ? LIVE_HOST : SANDBOX_HOST;
}

export function payFastProcessUrl(mode: string | undefined): string {
  return `https://${payFastHost(mode)}/eng/process`;
}

export function payFastValidateUrl(mode: string | undefined): string {
  return `https://${payFastHost(mode)}/eng/query/validate`;
}

export function parseZarCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

/**
 * PayFast publishes these notification ranges. Netlify normally forwards the
 * origin through x-forwarded-for; when an IP is available, reject unexpected
 * sources before doing the stronger PayFast server confirmation.
 */
const PAYFAST_IP_RANGES: readonly [number, number][] = [
  [ipv4ToNumber("197.97.145.144"), ipv4ToNumber("197.97.145.159")],
  [ipv4ToNumber("41.74.179.192"), ipv4ToNumber("41.74.179.223")],
  [ipv4ToNumber("102.216.36.0"), ipv4ToNumber("102.216.36.15")],
  [ipv4ToNumber("102.216.36.128"), ipv4ToNumber("102.216.36.143")],
  [ipv4ToNumber("144.126.193.139"), ipv4ToNumber("144.126.193.139")],
  // AWS addresses announced by PayFast for the post-31 July 2025 migration.
  ...[
    "3.163.236.237", "3.163.238.237", "3.163.251.237", "3.163.232.237",
    "3.163.241.237", "3.163.245.237", "3.163.248.237", "3.163.234.237",
    "3.163.237.237", "3.163.243.237", "3.163.247.237", "3.163.242.237",
    "3.163.244.237", "3.163.249.237", "3.163.252.237", "3.163.235.237",
    "3.163.239.237", "3.163.250.237", "3.163.233.237", "3.163.246.237",
    "3.163.240.237",
  ].map((ip): [number, number] => [ipv4ToNumber(ip), ipv4ToNumber(ip)]),
];

function ipv4ToNumber(ip: string): number {
  return ip.split(".").reduce((result, octet) => result * 256 + Number(octet), 0);
}

export function isPayFastIp(ip: string | null): boolean {
  if (!ip || ip.includes(":")) return false;
  const value = ipv4ToNumber(ip.trim());
  return Number.isInteger(value) && PAYFAST_IP_RANGES.some(([start, end]) => value >= start && value <= end);
}

export function forwardedClientIp(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip")?.trim() ??
    null
  );
}

export function requiredPayFastConfig() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID?.trim();
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY?.trim();
  if (!merchantId || !merchantKey) {
    throw new Error("PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY are required");
  }
  return {
    merchantId,
    merchantKey,
    passphrase: process.env.PAYFAST_PASSPHRASE?.trim() || undefined,
    mode: process.env.PAYFAST_MODE?.trim() || "sandbox",
  };
}
