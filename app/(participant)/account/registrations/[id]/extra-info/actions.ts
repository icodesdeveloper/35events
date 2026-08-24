"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth as participantAuth } from "@/lib/auth/participant";
import { getExtraInfoAvailability, EXTRA_INFO_CLOSED_MESSAGE } from "@/lib/questionForms";

export type ExtraInfoState = { error?: string; fieldErrors?: Record<string, string> };

export async function submitExtraInfoAnswers(
  registrationId: string,
  _prevState: ExtraInfoState,
  formData: FormData,
): Promise<ExtraInfoState> {
  const session = await participantAuth();
  const participantId = session?.user?.participantId;
  if (!participantId) return { error: "Je moet ingelogd zijn." };

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: { include: { questionForm: { include: { questions: true } } } } },
  });
  if (!registration || registration.participantId !== participantId) {
    return { error: "Registratie niet gevonden." };
  }

  const form = registration.event.questionForm;
  if (!form) return { error: "Er zijn momenteel geen bijkomende vragen voor dit event." };

  const availability = getExtraInfoAvailability(form);
  if (!availability.open) return { error: EXTRA_INFO_CLOSED_MESSAGE[availability.reason] };

  const fieldErrors: Record<string, string> = {};
  const values: { questionId: string; value: string }[] = [];

  for (const question of form.questions) {
    const raw = formData.get(question.id);
    const value = typeof raw === "string" ? raw.trim() : "";

    if (!value) {
      if (question.required) fieldErrors[question.id] = "Dit veld is verplicht";
      continue;
    }

    if (question.type === "EMAIL" && !z.email().safeParse(value).success) {
      fieldErrors[question.id] = "Ongeldig e-mailadres";
      continue;
    }
    if (question.type === "NUMBER" && Number.isNaN(Number(value))) {
      fieldErrors[question.id] = "Moet een nummer zijn";
      continue;
    }
    if (question.type === "SELECT") {
      const options = Array.isArray(question.options) ? (question.options as string[]) : [];
      if (!options.includes(value)) {
        fieldErrors[question.id] = "Ongeldige keuze";
        continue;
      }
    }

    values.push({ questionId: question.id, value });
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await prisma.$transaction(
    values.map(({ questionId, value }) =>
      prisma.eventQuestionAnswer.upsert({
        where: { questionId_registrationId: { questionId, registrationId } },
        create: { questionId, registrationId, value },
        update: { value },
      }),
    ),
  );

  redirect("/account");
}
