"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { generateUniquePaymentReference, getExpectedAmount, type PaymentStatus } from "@/lib/payments";
import { getEffectivePricing } from "@/lib/pricing";
import { findOrCreateParticipantByEmail } from "@/lib/participants";
import { notifyPaymentConfirmed } from "@/lib/notifications/payment";
import { sendMail } from "@/lib/mail/transporter";
import { registrationConfirmationEmail } from "@/lib/mail/templates";
import { SITE_URL } from "@/lib/site";
import { getSettings } from "@/lib/settings";

export async function updatePaymentStatus(eventId: string, registrationId: string, status: PaymentStatus) {
  const current = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { paymentStatus: true },
  });
  await prisma.registration.update({ where: { id: registrationId }, data: { paymentStatus: status } });
  if (status === "CONFIRMED" && current?.paymentStatus !== "CONFIRMED") {
    await notifyPaymentConfirmed(registrationId);
  }
  revalidatePath(`/admin/events/${eventId}/registrations`);
}

export type AdminCreateRegistrationState = { error?: string; fieldErrors?: Record<string, string> };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lets the admin register someone who signed up outside the site (phone,
// in person, ...) — same data shape as the public flow, minus the vehicle
// photo, and the admin can set the initial payment status directly instead
// of waiting for a bank transfer to arrive.
export async function adminCreateRegistration(
  eventId: string,
  _prevState: AdminCreateRegistrationState,
  formData: FormData,
): Promise<AdminCreateRegistrationState> {
  // Two ways in: pick an existing account, or type an email for someone who
  // has none (a friend from WhatsApp). The email branch creates a
  // password-less participant they can reach via the magic-link login.
  const mode = formData.get("participantMode") === "email" ? "email" : "existing";
  const newEmail = String(formData.get("newParticipantEmail") ?? "").trim();
  let participantId = String(formData.get("participantId") ?? "");
  const vehicleMake = String(formData.get("vehicleMake") ?? "").trim();
  const vehicleModel = String(formData.get("vehicleModel") ?? "").trim();
  const vehicleType = String(formData.get("vehicleType") ?? "").trim() || null;
  const paymentStatus = formData.get("paymentStatus") === "CONFIRMED" ? "CONFIRMED" : "PENDING_PAYMENT";
  const passengerCountRaw = Number(formData.get("passengerCount") ?? 0);
  const passengerCount = Number.isFinite(passengerCountRaw) ? Math.max(0, Math.trunc(passengerCountRaw)) : 0;

  if (!vehicleMake) return { fieldErrors: { vehicleMake: "Merk is verplicht" } };
  if (!vehicleModel) return { fieldErrors: { vehicleModel: "Model is verplicht" } };

  if (mode === "email") {
    if (!EMAIL_PATTERN.test(newEmail)) {
      return { fieldErrors: { newParticipantEmail: "Geef een geldig e-mailadres op" } };
    }
    const { participant: created } = await findOrCreateParticipantByEmail(newEmail);
    participantId = created.id;
  } else if (!participantId) {
    return { fieldErrors: { participantId: "Kies een gebruiker" } };
  }

  const [event, participant, existing] = await Promise.all([
    prisma.event.findUniqueOrThrow({ where: { id: eventId }, include: { earlybirdPrices: true } }),
    prisma.participant.findUnique({ where: { id: participantId } }),
    prisma.registration.findUnique({ where: { eventId_participantId: { eventId, participantId } } }),
  ]);
  if (!participant) return { fieldErrors: { participantId: "Gebruiker niet gevonden" } };
  if (existing) return { error: "Deze gebruiker is al geregistreerd voor dit event." };

  if (passengerCount > event.maxPassengers) {
    return { fieldErrors: { passengerCount: `Max. ${event.maxPassengers} passagier(s) toegelaten voor dit event.` } };
  }

  const { price, passengerPrice } = getEffectivePricing(event);
  const paymentReference = await generateUniquePaymentReference();

  const registration = await prisma.registration.create({
    data: {
      eventId,
      participantId,
      vehicleMake,
      vehicleModel,
      vehicleType,
      passengerCount,
      priceSnapshot: price,
      passengerPriceSnapshot: passengerCount > 0 ? passengerPrice : null,
      paymentReference,
      paymentStatus,
      addedManually: true,
    },
  });

  if (participant.email) {
    if (paymentStatus === "CONFIRMED") {
      await notifyPaymentConfirmed(registration.id);
    } else {
      const expectedAmount = getExpectedAmount(registration);
      const settings = await getSettings();
      const { subject, text, html } = await registrationConfirmationEmail(
        event.name,
        `${SITE_URL}/account`,
        paymentReference,
        expectedAmount,
        { iban: settings.bankAccountIban, accountName: settings.bankAccountName },
      );
      await sendMail({ to: participant.email, subject, text, html }).catch(() => {});
    }
  }

  revalidatePath(`/admin/events/${eventId}/registrations`);
  revalidatePath("/admin");
  return {};
}

// A hard delete, not a cancellation — the [eventId, participantId] unique
// constraint on Registration means a merely-cancelled row would still block
// the participant from registering again, which defeats the point of this
// action (the admin explicitly wants them able to re-register).
export async function deleteRegistration(eventId: string, registrationId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { vehiclePhotoPath: true },
  });
  if (!registration) return;

  await prisma.registration.delete({ where: { id: registrationId } });
  if (registration.vehiclePhotoPath) await storage.delete(registration.vehiclePhotoPath);

  revalidatePath(`/admin/events/${eventId}/registrations`);
  revalidatePath("/admin");
  revalidatePath("/admin/events");
}
