import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export type PayFastMode = "sandbox" | "live";

interface PayFastSettings {
  mode: PayFastMode;
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  processUrl: string;
  validationUrl: string;
}

const PAYFAST_IP_RANGES = [
  { address: "197.97.145.144", prefix: 28 },
  { address: "41.74.179.192", prefix: 27 },
  { address: "102.216.36.0", prefix: 28 },
  { address: "102.216.36.128", prefix: 28 },
  { address: "144.126.193.139", prefix: 32 },
];

export function getPayFastSettings(): PayFastSettings | null {
  const mode = process.env.PAYFAST_MODE;
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;

  if (
    (mode !== "sandbox" && mode !== "live") ||
    !merchantId ||
    !/^\d{8}$/.test(merchantId) ||
    !merchantKey
  ) {
    return null;
  }

  const host = mode === "sandbox" ? "sandbox.payfast.co.za" : "www.payfast.co.za";

  return {
    mode,
    merchantId,
    merchantKey,
    passphrase: process.env.PAYFAST_PASSPHRASE ?? "",
    processUrl: `https://${host}/eng/process`,
    validationUrl: `https://${host}/eng/query/validate`,
  };
}

export function encodePayFastValue(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*~]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    )
    .replace(/%[\da-f]{2}/gi, (escape) => escape.toUpperCase());
}

export function createPayFastParameterString(
  entries: readonly (readonly [string, string])[],
  options: { passphrase?: string; includeEmptyValues?: boolean } = {}
): string {
  const parts = entries
    .filter(
      ([name, value]) =>
        name !== "signature" && (options.includeEmptyValues || value.trim() !== "")
    )
    .map(([name, value]) => `${name}=${encodePayFastValue(value)}`);

  if (options.passphrase) {
    parts.push(`passphrase=${encodePayFastValue(options.passphrase)}`);
  }

  return parts.join("&");
}

export function createPayFastSignature(
  entries: readonly (readonly [string, string])[],
  passphrase: string
): string {
  return createHash("md5")
    .update(createPayFastParameterString(entries, { passphrase }))
    .digest("hex");
}

export function verifyPayFastSignature(
  entries: readonly (readonly [string, string])[],
  signature: string,
  passphrase: string
): boolean {
  if (!/^[\da-f]{32}$/i.test(signature)) return false;

  const expected = Buffer.from(
    createHash("md5")
      .update(
        createPayFastParameterString(entries, {
          passphrase,
          includeEmptyValues: true,
        })
      )
      .digest("hex"),
    "hex"
  );
  const received = Buffer.from(signature, "hex");

  return expected.length === received.length && timingSafeEqual(expected, received);
}

function ipv4ToInteger(value: string): number | null {
  const normalized = value.trim().replace(/^::ffff:/i, "");
  const octets = normalized.split(".");
  if (octets.length !== 4) return null;

  let address = 0;
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return null;
    const number = Number(octet);
    if (number > 255) return null;
    address = (address * 256 + number) >>> 0;
  }
  return address;
}

function isWithinRange(address: number, network: number, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (address & mask) === (network & mask);
}

export function isPayFastSource(request: NextRequest): boolean {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const sourceIp =
    request.headers.get("x-nf-client-connection-ip") ??
    request.headers.get("x-real-ip") ??
    forwardedFor?.split(",").at(-1)?.trim();
  if (!sourceIp) return false;

  const address = ipv4ToInteger(sourceIp);
  if (address === null) return false;

  return PAYFAST_IP_RANGES.some(({ address: networkAddress, prefix }) => {
    const network = ipv4ToInteger(networkAddress);
    return network !== null && isWithinRange(address, network, prefix);
  });
}