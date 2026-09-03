"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isWellFormedReference } from "@/lib/paymentReference";
import { getExpectedAmount, getPaymentBalance, type PaymentBalanceStatus } from "@/lib/payments";
import { notifyPaymentConfirmed } from "@/lib/notifications/payment";

export type RecordPaymentResult =
  | {
      ok: true;
      participant: string;
      eventName: string;
      amount: number;
      totalReceived: number;
      expected: number;
      balance: PaymentBalanceStatus;
      confirmed: boolean;
    }
  | { ok: false; error: string };

export async function recordPayment(paymentReferenceRaw: string, amountRaw: string): Promise<RecordPaymentResult> {
  const paymentReference = paymentReferenceRaw.trim().toUpperCase();
  if (!paymentReference) return { ok: false, error: "Geef een betaalcode op." };

  const amount = Number(amountRaw.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Geef een geldig bedrag op." };

  const registration = await prisma.registration.findUnique({
    where: { paymentReference },
    include: { participant: true, event: { select: { id: true, name: true } }, payments: true },
  });
  if (!registration) {
    // Separate the two reasons a code can miss. A prefixed code carries check
    // digits, so a failing checksum means it was mistyped rather than that it
    // belongs to nobody — worth saying, because the fix is different (look
    // again at the transfer vs. this person never registered). Codes from
    // before per-event prefixes have no checksum and fall through to the
    // generic message.
    const looksMistyped = /^[A-Z0-9]+-[A-Z]+[0-9]{2}$/.test(paymentReference) && !isWellFormedReference(paymentReference);
    return {
      ok: false,
      error: looksMistyped
        ? `De code "${paymentReference}" klopt niet — de controlecijfers komen niet overeen. Kijk de code na op het overschrijvingsbericht.`
        : `Geen deelname gevonden met code "${paymentReference}".`,
    };
  }

  await prisma.payment.create({ data: { registrationId: registration.id, amount } });

  const totalReceived =
    registration.payments.reduce((sum, payment) => sum + Number(payment.amount.toString()), 0) + amount;
  const expected = getExpectedAmount(registration);
  const balance = getPaymentBalance(totalReceived, expected);

  let confirmed = registration.paymentStatus === "CONFIRMED";
  if ((balance === "PAID" || balance === "OVERPAID") && registration.paymentStatus === "PENDING_PAYMENT") {
    await prisma.registration.update({ where: { id: registration.id }, data: { paymentStatus: "CONFIRMED" } });
    confirmed = true;
    await notifyPaymentConfirmed(registration.id);
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath(`/admin/events/${registration.event.id}/registrations`);

  return {
    ok: true,
    participant: registration.participant.username,
    eventName: registration.event.name,
    amount,
    totalReceived,
    expected,
    balance,
    confirmed,
  };
}
