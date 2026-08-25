"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth as participantAuth } from "@/lib/auth/participant";
import { getExtraInfoAvailability, EXTRA_INFO_CLOSED_MESSAGE, collectQuestionAnswers } from "@/lib/questionForms";
import type { QuestionType } from "@/lib/validation/question";

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

  const questions = form.questions.map((q) => ({
    id: q.id,
    type: q.type as QuestionType,
    label: q.label,
    required: q.required,
    perPassenger: q.perPassenger,
    options: Array.isArray(q.options) ? (q.options as string[]) : null,
  }));

  const { fieldErrors, values } = collectQuestionAnswers(questions, registration.passengerCount, formData, {
    enforceRequired: true,
  });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await prisma.$transaction(
    values.map(({ questionId, passengerIndex, value }) =>
      prisma.eventQuestionAnswer.upsert({
        where: { questionId_registrationId_passengerIndex: { questionId, registrationId, passengerIndex } },
        create: { questionId, registrationId, passengerIndex, value },
        update: { value },
      }),
    ),
  );

  redirect("/account");
}
