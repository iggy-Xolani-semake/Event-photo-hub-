import { customAlphabet } from "nanoid";

// Deliberately excludes visually ambiguous characters (0/O, 1/I/L) so a
// guest reading a code off a printed poster doesn't mistype it. Spec
// section 12 asks for something like SMK4827Q — this alphabet + length
// gives ~36^8 combinations, which is not brute-forceable by casually
// trying URLs, and is short enough to type by hand if the QR scan fails.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const generate = customAlphabet(ALPHABET, 8);

export function generateEventCode(): string {
  return generate();
}

export function isValidEventCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{6,12}$/.test(code);
}

/**
 * Pulls an event code out of whatever a guest pastes into the landing page's
 * lookup field: a bare code, a path like /e/ABCD1234, or a full URL copied
 * from a share message.
 *
 * Validation deliberately goes through isValidEventCodeFormat so the landing
 * page can never promise a link that /e/[code] would then reject.
 * Returns null (rather than throwing) because every caller shows the same
 * "check the code and try again" message.
 */
export function parseEventCodeOrLink(value: string): string | null {
  const input = value.trim();
  if (!input) return null;

  let candidate = input;

  // Absolute or protocol-relative URL: take the pathname and match on that.
  if (/^https?:\/\//i.test(input) || input.startsWith("/")) {
    try {
      const parsed = new URL(input, "https://shutaMzala.local");
      const match = parsed.pathname.match(/^\/(?:e|gallery)\/([^/]+)\/?$/i);
      if (!match?.[1]) return null;
      candidate = match[1];
    } catch {
      return null;
    }
  } else {
    // Bare "e/CODE" style shorthand, no host.
    candidate = input.replace(/^\/?(?:e|gallery)\//i, "");
  }

  const code = candidate.trim().toUpperCase();
  return isValidEventCodeFormat(code) ? code : null;
}

export function guestSessionCookieName(eventCode: string): string {
  return `eph_guest_session_${eventCode.toUpperCase()}`;
}
