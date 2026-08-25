import { prisma } from "@/lib/prisma";

export type PaymentStatus = "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED";

// Excludes visually-ambiguous characters (0/O, 1/I/L) so a code is easy to
// read back off a bank transfer confirmation or receipt.
const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const REFERENCE_LENGTH = 6;

function randomReferenceCandidate(): string {
  let code = "";
  for (let i = 0; i < REFERENCE_LENGTH; i++) {
    code += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return code;
}

// Retries on the rare collision. Not fully race-safe against a concurrent
// insert landing between the check and the create, but the DB's unique
// constraint on Registration.paymentReference is the backstop for that —
// registration volume here makes the race astronomically unlikely anyway.
export async function generateUniquePaymentReference(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = randomReferenceCandidate();
    const existing = await prisma.registration.findUnique({ where: { paymentReference: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Kon geen unieke betaalcode genereren");
}

type DecimalLike = { toString(): string } | number | string;

export function getExpectedAmount(registration: {
  priceSnapshot: DecimalLike | null;
  passengerPriceSnapshot: DecimalLike | null;
  passengerCount: number;
  discountAmountSnapshot?: DecimalLike | null;
}): number {
  const price = registration.priceSnapshot != null ? Number(registration.priceSnapshot.toString()) : 0;
  const passengerPrice =
    registration.passengerCount > 0 && registration.passengerPriceSnapshot != null
      ? Number(registration.passengerPriceSnapshot.toString()) * registration.passengerCount
      : 0;
  const discount =
    registration.discountAmountSnapshot != null ? Number(registration.discountAmountSnapshot.toString()) : 0;
  return Math.max(0, price + passengerPrice - discount);
}

export type PaymentBalanceStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERPAID";

// Compares in cents to avoid binary floating-point drift when summing
// several Decimal-derived payment amounts (e.g. 12.30 + 22.70 !== 35.00).
export function getPaymentBalance(totalReceived: number, expected: number): PaymentBalanceStatus {
  const receivedCents = Math.round(totalReceived * 100);
  const expectedCents = Math.round(expected * 100);
  if (expectedCents <= 0) return receivedCents > 0 ? "OVERPAID" : "PAID";
  if (receivedCents <= 0) return "UNPAID";
  if (receivedCents < expectedCents) return "PARTIAL";
  if (receivedCents > expectedCents) return "OVERPAID";
  return "PAID";
}

export const PAYMENT_BALANCE_LABEL: Record<PaymentBalanceStatus, string> = {
  UNPAID: "Nog niets betaald",
  PARTIAL: "Te weinig betaald",
  PAID: "Volledig betaald",
  OVERPAID: "Te veel betaald",
};

// Shared by the admin dashboard stat cards and /admin/payments — cancelled
// registrations are excluded since there's nothing left to collect on them.
export async function getRegistrationPaymentOverview() {
  const registrations = await prisma.registration.findMany({
    where: { paymentStatus: { not: "CANCELLED" } },
    include: {
      participant: true,
      event: { select: { id: true, name: true } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return registrations.map((registration) => {
    const expected = getExpectedAmount(registration);
    const totalReceived = registration.payments.reduce((sum, payment) => sum + Number(payment.amount.toString()), 0);
    const balance = getPaymentBalance(totalReceived, expected);
    return { registration, expected, totalReceived, balance };
  });
}
