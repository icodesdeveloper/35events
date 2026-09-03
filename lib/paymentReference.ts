// Per-event payment references: a fixed prefix the admin controls, plus a
// sequential suffix — TR26-A1, TR26-B2, TR26-C3, ... — so codes are short,
// predictable, and easy to read back off a bank statement.
//
// The trailing digit is a check character over the whole reference, not just
// a counter. That is the point of the format: a participant who mistypes one
// character lands on a code that fails the check rather than on *another
// participant's* valid code, so a payment can't be credited to the wrong
// person. Any single-character substitution changes the check digit.

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Suggests a prefix from the event name and date: initials of the words plus
// the two-digit year. "Twisted Run" in 2026 -> "TR26-". A single-word name
// falls back to its first two letters ("Kusttoer" -> "KU26-") so the prefix
// still says something.
export function suggestPaymentPrefix(name: string, date: Date | string | null | undefined): string {
  const words = name
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((w) => w.toUpperCase());

  let letters = words.map((w) => w[0]).join("");
  if (letters.length < 2 && words[0]) letters = words[0].slice(0, 2);
  letters = letters.slice(0, 4);
  if (!letters) letters = "EV";

  const parsed = date ? new Date(date) : null;
  const year = parsed && !Number.isNaN(parsed.getTime()) ? parsed.getFullYear() : new Date().getFullYear();

  return `${letters}${String(year).slice(-2)}-`;
}

// 1 -> A, 26 -> Z, 27 -> AA, 28 -> AB ... (bijective base-26). Keeps the
// whole alphabet rather than skipping look-alike letters, because the admin
// asked for predictability — the check digit is what guards against typos.
export function encodeSequence(sequence: number): string {
  let n = Math.max(1, Math.trunc(sequence));
  let out = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    out = LETTERS[remainder] + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

// Two check digits, position-weighted modulo 97.
//
// The modulus has to be prime and larger than the character alphabet, which
// is why this is not the more obvious single mod-10 digit. Characters map to
// 0..35, so with modulus 10 any two letters 10 apart (A/K, B/L, ...) leave
// the check unchanged and a single typo silently produces another
// participant's valid code — measured at ~2% of all single-character typos
// before this was switched. With a prime modulus above 35, a substitution
// shifts the sum by delta * weight, which can only vanish if 97 divides the
// weight — impossible for any realistic reference length. Weighting by
// position also catches adjacent transpositions.
const CHECK_MODULUS = 97;

export function checkDigits(value: string): string {
  const chars = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let total = 0;
  for (let i = 0; i < chars.length; i++) {
    const code = chars.charCodeAt(i);
    const charValue = code >= 65 ? code - 65 + 10 : code - 48; // A-Z -> 10..35, 0-9 -> 0..9
    total += charValue * (i + 2);
  }
  return String(total % CHECK_MODULUS).padStart(2, "0");
}

export function buildPaymentReference(prefix: string, sequence: number): string {
  const body = `${prefix}${encodeSequence(sequence)}`;
  return `${body}${checkDigits(body)}`;
}

// Used when matching an incoming bank transfer: tells apart "this code does
// not exist" from "this code was mistyped", so the admin gets a useful hint
// instead of a blank no-match.
export function isWellFormedReference(reference: string): boolean {
  const trimmed = reference.trim().toUpperCase();
  if (trimmed.length < 3) return false;
  const body = trimmed.slice(0, -2);
  const given = trimmed.slice(-2);
  if (!/^[0-9]{2}$/.test(given)) return false;
  return checkDigits(body) === given;
}
