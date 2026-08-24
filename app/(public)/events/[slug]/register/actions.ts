"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth as participantAuth, signOut as participantSignOut } from "@/lib/auth/participant";
import { registrationFormSchema } from "@/lib/validation/registration";
import { saveCompressedUploadedFile } from "@/lib/storage";
import { generateUniquePaymentReference, getExpectedAmount } from "@/lib/payments";

const MAX_VEHICLE_PHOTO_BYTES = 1_000_000;
import { sendMail } from "@/lib/mail/transporter";
import { registrationConfirmationEmail } from "@/lib/mail/templates";

export type RegistrationFormState = { error?: string; fieldErrors?: Record<string, string> };

export async function submitRegistration(
  slug: string,
  _prevState: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  const session = await participantAuth();
  const participantId = session?.user?.participantId;
  if (!participantId) return { error: "Je moet ingelogd zijn om te registreren." };

  // The session cookie is self-contained (JWT) and stays "valid" even if the
  // underlying account was removed (e.g. a database reset during local dev,
  // or an admin deleting the account) — without this check that produces a
  // confusing foreign-key crash on the insert below instead of a clean
  // re-login prompt.
  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant) {
    await participantSignOut({ redirectTo: `/login?callbackUrl=${encodeURIComponent(`/events/${slug}/register`)}` });
  }

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || !event.published || !event.registrationOpen) {
    return { error: "Registratie is niet (meer) open voor dit event." };
  }

  const existing = await prisma.registration.findUnique({
    where: { eventId_participantId: { eventId: event.id, participantId } },
  });
  if (existing) return { error: "Je bent al geregistreerd voor dit event." };

  const result = registrationFormSchema.safeParse({
    vehicleMake: formData.get("vehicleMake"),
    vehicleModel: formData.get("vehicleModel"),
    vehicleType: formData.get("vehicleType") || undefined,
    hasPassenger: formData.get("hasPassenger"),
  });
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const vehiclePhoto = formData.get("vehiclePhoto");
  if (!(vehiclePhoto instanceof File) || vehiclePhoto.size === 0) {
    return { fieldErrors: { vehiclePhoto: "Foto van je voertuig is verplicht" } };
  }

  const vehiclePhotoPath = await saveCompressedUploadedFile(
    vehiclePhoto,
    `registrations/${event.id}`,
    MAX_VEHICLE_PHOTO_BYTES,
  );
  const { vehicleMake, vehicleModel, vehicleType, hasPassenger } = result.data;
  const paymentReference = await generateUniquePaymentReference();

  const registration = await prisma.registration.create({
    data: {
      eventId: event.id,
      participantId,
      vehicleMake,
      vehicleModel,
      vehicleType,
      vehiclePhotoPath,
      hasPassenger,
      priceSnapshot: event.price,
      passengerPriceSnapshot: hasPassenger ? event.passengerPrice : null,
      paymentReference,
    },
  });

  if (session.user.email) {
    const expectedAmount = getExpectedAmount(registration);
    const { subject, text, html } = registrationConfirmationEmail(
      event.name,
      "/account",
      paymentReference,
      expectedAmount,
    );
    await sendMail({ to: session.user.email, subject, text, html }).catch(() => {});
  }

  redirect(`/events/${slug}/register/success`);
}
