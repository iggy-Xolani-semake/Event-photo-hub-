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
