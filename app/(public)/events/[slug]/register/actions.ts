"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth as participantAuth, signOut as participantSignOut } from "@/lib/auth/participant";
import { registrationFormSchema } from "@/lib/validation/registration";
import { saveCompressedUploadedFile } from "@/lib/storage";
import { generateUniquePaymentReference, getExpectedAmount } from "@/lib/payments";
import { validateDiscountCode, computeDiscountAmount, DISCOUNT_VALIDATION_MESSAGE } from "@/lib/discounts";
import { collectQuestionAnswers, type PassengerQuestion } from "@/lib/questionForms";
import type { QuestionType } from "@/lib/validation/question";
import { getEffectivePricing } from "@/lib/pricing";

const MAX_VEHICLE_PHOTO_BYTES = 1_000_000;
import { sendMail } from "@/lib/mail/transporter";
import { registrationConfirmationEmail } from "@/lib/mail/templates";
import { SITE_URL } from "@/lib/site";
import { getSettings } from "@/lib/settings";

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

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      questionForm: { include: { questions: { orderBy: { order: "asc" } } } },
      earlybirdPrices: true,
    },
  });
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
    passengerCount: formData.get("passengerCount"),
    discountCode: formData.get("discountCode") || undefined,
  });
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { vehicleMake, vehicleModel, vehicleType, passengerCount, discountCode } = result.data;

  if (passengerCount > event.maxPassengers) {
    return { fieldErrors: { passengerCount: `Max. ${event.maxPassengers} passagier(s) toegelaten voor dit event.` } };
  }

  const vehiclePhoto = formData.get("vehiclePhoto");
  if (!(vehiclePhoto instanceof File) || vehiclePhoto.size === 0) {
    return { fieldErrors: { vehiclePhoto: "Foto van je voertuig is verplicht" } };
  }

  const questionForm = event.questionForm;
  const questions: PassengerQuestion[] =
    questionForm?.published
      ? questionForm.questions.map((q) => ({
          id: q.id,
          type: q.type as QuestionType,
          label: q.label,
          required: q.required,
          options: Array.isArray(q.options) ? (q.options as string[]) : null,
          perPassenger: q.perPassenger,
        }))
      : [];
  const { fieldErrors: answerFieldErrors, values: answerValues } = collectQuestionAnswers(
    questions,
    passengerCount,
    formData,
    { enforceRequired: false },
  );
  if (Object.keys(answerFieldErrors).length > 0) return { fieldErrors: answerFieldErrors };

  // Both rates come from the same call so the driver and passenger price can
  // never be read from different earlybird tiers.
  const { price, passengerPrice } = getEffectivePricing(event);
  const subtotal = price + passengerCount * passengerPrice;

  let discountId: string | undefined;
  let discountAmount = 0;
  let discountMaxUses: number | null = null;
  if (discountCode) {
    const validation = await validateDiscountCode(discountCode, { eventId: event.id, participantId });
    if (!validation.ok) {
      return { fieldErrors: { discountCode: DISCOUNT_VALIDATION_MESSAGE[validation.reason] } };
    }
    discountId = validation.discount.id;
    discountAmount = computeDiscountAmount(validation.discount, subtotal);
    discountMaxUses = validation.discount.maxUses;
  }

  const vehiclePhotoPath = await saveCompressedUploadedFile(
    vehiclePhoto,
    `registrations/${event.id}`,
    MAX_VEHICLE_PHOTO_BYTES,
  );
  const paymentReference = await generateUniquePaymentReference(event);

  let registration;
  try {
    registration = await prisma.$transaction(async (tx) => {
      // Re-check maxUses atomically here (not just in the plain lookup done
      // by validateDiscountCode above) so two concurrent registrations can't
      // both slip in under the cap — the conditional update only succeeds
      // while a slot is still free at commit time.
      if (discountId) {
        const claimed = await tx.discountCode.updateMany({
          where: discountMaxUses != null ? { id: discountId, useCount: { lt: discountMaxUses } } : { id: discountId },
          data: { useCount: { increment: 1 } },
        });
        if (claimed.count === 0) throw new Error("DISCOUNT_EXHAUSTED");
      }

      const created = await tx.registration.create({
        data: {
          eventId: event.id,
          participantId,
          vehicleMake,
          vehicleModel,
          vehicleType,
          vehiclePhotoPath,
          passengerCount,
          priceSnapshot: price,
          // Snapshot the rate that was actually charged (earlybird included),
          // not the event's list price — otherwise the expected payment
          // recomputed later would not match what the visitor was quoted.
          passengerPriceSnapshot: passengerCount > 0 ? passengerPrice : null,
          discountCodeId: discountId,
          discountAmountSnapshot: discountId ? discountAmount : null,
          paymentReference,
        },
      });

      if (answerValues.length > 0) {
        await tx.eventQuestionAnswer.createMany({
          data: answerValues.map((a) => ({
            registrationId: created.id,
            questionId: a.questionId,
            passengerIndex: a.passengerIndex,
            value: a.value,
          })),
        });
      }

      return created;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "DISCOUNT_EXHAUSTED") {
      return { fieldErrors: { discountCode: DISCOUNT_VALIDATION_MESSAGE.MAX_USES_REACHED } };
    }
    throw err;
  }

  if (session.user.email) {
    const expectedAmount = getExpectedAmount(registration);
    const settings = await getSettings();
    const { subject, text, html } = await registrationConfirmationEmail(
      event.name,
      `${SITE_URL}/account`,
      paymentReference,
      expectedAmount,
      { iban: settings.bankAccountIban, accountName: settings.bankAccountName },
    );
    await sendMail({ to: session.user.email, subject, text, html }).catch(() => {});
  }

  redirect(`/events/${slug}/register/success`);
}
