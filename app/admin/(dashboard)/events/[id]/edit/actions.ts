"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseEventFormData } from "@/lib/validation/event";
import { questionFormSchema, parseOptions, type QuestionType } from "@/lib/validation/question";
import { saveUploadedFile, storage } from "@/lib/storage";
import { notifyRegistrantsOfPublish } from "@/lib/notifications/extraInfo";

export type QuestionItem = {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  perPassenger: boolean;
  options: string[] | null;
  order: number;
};

export type EarlybirdPriceItem = { id: string; deadline: string; price: string };

export type EventEditState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  questionErrors?: Record<string, string>;
  earlybirdErrors?: Record<string, string>;
  questions?: QuestionItem[];
  published?: boolean;
  deadline?: string | null;
  responsesOpen?: boolean;
  earlybirdPrices?: EarlybirdPriceItem[];
  savedAt?: number;
};

type DraftQuestionInput = {
  clientKey: string;
  id?: string;
  type: string;
  label: string;
  required: boolean;
  perPassenger: boolean;
  options?: string;
};

type DraftEarlybirdPriceInput = { clientKey: string; id?: string; deadline: string; price: string };

// Single save path for the whole event-edit page: event fields + cover photo
// + the full questions list + deadline, in one transaction. Whichever of the
// two top-of-page buttons (Concept opslaan / Publiceren) was clicked is
// carried via the "intent" field of the submitting <button>, so there is
// never a scenario where in-progress edits are lost by clicking the "wrong"
// button — both buttons always save everything.
export async function saveEventEdit(
  eventId: string,
  formId: string,
  _prevState: EventEditState,
  formData: FormData,
): Promise<EventEditState> {
  const { data, fieldErrors } = parseEventFormData(formData);
  if (!data) return { fieldErrors: fieldErrors ?? undefined };

  const existingSlug = await prisma.event.findFirst({ where: { slug: data.slug, NOT: { id: eventId } } });
  if (existingSlug) return { fieldErrors: { slug: "Deze slug is al in gebruik" } };

  const intent = formData.get("intent") === "publish" ? "publish" : "draft";
  const deadlineRaw = formData.get("deadline");
  const deadline = typeof deadlineRaw === "string" && deadlineRaw ? new Date(deadlineRaw) : null;
  const responsesOpen = formData.get("responsesOpen") === "on";

  let draftQuestions: DraftQuestionInput[];
  try {
    const raw = formData.get("questionsJson");
    draftQuestions = typeof raw === "string" && raw ? JSON.parse(raw) : [];
  } catch {
    return { error: "Ongeldige vragenlijst — probeer opnieuw." };
  }

  const questionErrors: Record<string, string> = {};
  const validatedQuestions: {
    clientKey: string;
    id?: string;
    type: QuestionType;
    label: string;
    required: boolean;
    perPassenger: boolean;
    options: string[] | undefined;
  }[] = [];
  for (const q of draftQuestions) {
    const result = questionFormSchema.safeParse({
      type: q.type,
      label: q.label,
      required: q.required,
      options: q.options || undefined,
    });
    if (!result.success) {
      questionErrors[q.clientKey] = result.error.issues[0]?.message ?? "Ongeldige vraag";
      continue;
    }
    const { type, label, required, options } = result.data;
    if (type === "SELECT" && parseOptions(options).length < 2) {
      questionErrors[q.clientKey] = "Geef minstens 2 keuzes op, één per lijn";
      continue;
    }
    validatedQuestions.push({
      clientKey: q.clientKey,
      id: q.id,
      type: type as QuestionType,
      label,
      required,
      perPassenger: Boolean(q.perPassenger),
      options: type === "SELECT" ? parseOptions(options) : undefined,
    });
  }
  if (Object.keys(questionErrors).length > 0) return { questionErrors };

  let draftEarlybirdPrices: DraftEarlybirdPriceInput[];
  try {
    const raw = formData.get("earlybirdPricesJson");
    draftEarlybirdPrices = typeof raw === "string" && raw ? JSON.parse(raw) : [];
  } catch {
    return { error: "Ongeldige earlybird-prijzen — probeer opnieuw." };
  }

  const earlybirdErrors: Record<string, string> = {};
  const validatedEarlybirdPrices: { clientKey: string; id?: string; deadline: Date; price: number }[] = [];
  for (const tier of draftEarlybirdPrices) {
    if (!tier.deadline) {
      earlybirdErrors[tier.clientKey] = "Kies een deadline";
      continue;
    }
    const deadline = new Date(tier.deadline);
    if (Number.isNaN(deadline.getTime())) {
      earlybirdErrors[tier.clientKey] = "Ongeldige deadline";
      continue;
    }
    const price = Number(tier.price);
    if (!tier.price || Number.isNaN(price) || price <= 0) {
      earlybirdErrors[tier.clientKey] = "Geef een prijs groter dan 0 op";
      continue;
    }
    validatedEarlybirdPrices.push({ clientKey: tier.clientKey, id: tier.id, deadline, price });
  }
  if (Object.keys(earlybirdErrors).length > 0) return { earlybirdErrors };

  const current = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  let coverImagePath = current.coverImagePath;
  const coverImage = formData.get("coverImage");
  if (coverImage instanceof File && coverImage.size > 0) {
    if (coverImagePath) await storage.delete(coverImagePath);
    coverImagePath = await saveUploadedFile(coverImage, "events/covers");
  }

  const existingQuestions = await prisma.eventQuestion.findMany({ where: { formId }, select: { id: true } });
  const keepIds = new Set(
    validatedQuestions.map((q) => q.id).filter((id): id is string => Boolean(id)),
  );
  const idsToDelete = existingQuestions.filter((q) => !keepIds.has(q.id)).map((q) => q.id);

  const existingEarlybirdPrices = await prisma.earlybirdPrice.findMany({ where: { eventId }, select: { id: true } });
  const keepEarlybirdIds = new Set(
    validatedEarlybirdPrices.map((t) => t.id).filter((id): id is string => Boolean(id)),
  );
  const earlybirdIdsToDelete = existingEarlybirdPrices
    .filter((t) => !keepEarlybirdIds.has(t.id))
    .map((t) => t.id);

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : null,
        distanceKm: data.distanceKm ?? null,
        durationMinutes: data.durationMinutes ?? null,
        price: data.price ?? null,
        passengerPrice: data.passengerPrice ?? null,
        maxPassengers: data.maxPassengers,
        published: data.published,
        registrationOpen: data.registrationOpen,
        coverImagePath,
      },
    });

    if (idsToDelete.length > 0) {
      await tx.eventQuestion.deleteMany({ where: { id: { in: idsToDelete } } });
    }

    for (let index = 0; index < validatedQuestions.length; index++) {
      const q = validatedQuestions[index];
      if (q.id) {
        await tx.eventQuestion.update({
          where: { id: q.id },
          data: {
            type: q.type,
            label: q.label,
            required: q.required,
            perPassenger: q.perPassenger,
            options: q.options,
            order: index,
          },
        });
      } else {
        await tx.eventQuestion.create({
          data: {
            formId,
            type: q.type,
            label: q.label,
            required: q.required,
            perPassenger: q.perPassenger,
            options: q.options,
            order: index,
          },
        });
      }
    }

    if (earlybirdIdsToDelete.length > 0) {
      await tx.earlybirdPrice.deleteMany({ where: { id: { in: earlybirdIdsToDelete } } });
    }

    for (const tier of validatedEarlybirdPrices) {
      if (tier.id) {
        await tx.earlybirdPrice.update({ where: { id: tier.id }, data: { deadline: tier.deadline, price: tier.price } });
      } else {
        await tx.earlybirdPrice.create({ data: { eventId, deadline: tier.deadline, price: tier.price } });
      }
    }

    await tx.eventQuestionForm.update({
      where: { id: formId },
      data: {
        deadline,
        responsesOpen,
        ...(intent === "publish" ? { published: true, publishedAt: new Date() } : {}),
      },
    });
  });

  if (intent === "publish") {
    await notifyRegistrantsOfPublish(eventId);
  }

  revalidatePath(`/admin/events/${eventId}/edit`);
  revalidatePath("/admin/events");
  revalidatePath(`/events/${data.slug}`);
  revalidatePath("/");

  const [freshQuestions, freshForm, freshEarlybirdPrices] = await Promise.all([
    prisma.eventQuestion.findMany({ where: { formId }, orderBy: { order: "asc" } }),
    prisma.eventQuestionForm.findUniqueOrThrow({ where: { id: formId } }),
    prisma.earlybirdPrice.findMany({ where: { eventId }, orderBy: { deadline: "asc" } }),
  ]);

  return {
    questions: freshQuestions.map((q) => ({
      id: q.id,
      type: q.type as QuestionType,
      label: q.label,
      required: q.required,
      perPassenger: q.perPassenger,
      options: Array.isArray(q.options) ? (q.options as string[]) : null,
      order: q.order,
    })),
    earlybirdPrices: freshEarlybirdPrices.map((t) => ({
      id: t.id,
      deadline: t.deadline.toISOString().slice(0, 10),
      price: t.price.toString(),
    })),
    published: freshForm.published,
    deadline: freshForm.deadline ? freshForm.deadline.toISOString().slice(0, 10) : null,
    responsesOpen: freshForm.responsesOpen,
    savedAt: Date.now(),
  };
}
