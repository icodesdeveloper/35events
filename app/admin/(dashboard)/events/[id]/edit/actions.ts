"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { suggestPaymentPrefix } from "@/lib/paymentReference";
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

export type EarlybirdPriceItem = { id: string; deadline: string; price: string; passengerPrice: string | null };

// The event's own core content fields — everything editable in
// components/forms/EventFormFields.tsx plus the two registration-window
// dates. Snapshotted into Event.draftData while staged, unpublished.
export type EventDraftData = {
  name: string;
  slug: string;
  description: string;
  date: string;
  endDate: string | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  price: number | null;
  passengerPrice: number | null;
  maxPassengers: number;
  paymentReferencePrefix: string;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  coverImagePath?: string;
};

export type EventEditState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  questionErrors?: Record<string, string>;
  earlybirdErrors?: Record<string, string>;
  questions?: QuestionItem[];
  questionsPublished?: boolean;
  deadline?: string | null;
  responsesOpen?: boolean;
  earlybirdPrices?: EarlybirdPriceItem[];
  hasDraft?: boolean;
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

type DraftEarlybirdPriceInput = { clientKey: string; id?: string; deadline: string; price: string; passengerPrice?: string };

type Intent = "draft" | "publish" | "publish-questions";

// Single save path for the whole event-edit page: event fields + cover photo
// + the full questions/earlybird list, in one transaction. Which of the
// buttons was clicked is carried via the "intent" field of the submitting
// <button> — "draft"/"publish" govern the event's own content (see below),
// "publish-questions" is the separate, unrelated "publish the extra-info
// form to registrants" action that lives inside the vragen section.
//
// eventId/formId are null when creating a brand new event — in that case
// this same function creates the Event + EventQuestionForm (+ any
// questions/earlybird rows already added) together, then redirects to the
// real edit URL, mirroring saveCampaign's create-or-update pattern
// (app/admin/(dashboard)/communications/actions.ts).
export async function saveEventEdit(
  eventId: string | null,
  formId: string | null,
  _prevState: EventEditState,
  formData: FormData,
): Promise<EventEditState> {
  const { data, fieldErrors } = parseEventFormData(formData);
  if (!data) return { fieldErrors: fieldErrors ?? undefined };

  const existingSlug = await prisma.event.findFirst({
    where: eventId ? { slug: data.slug, NOT: { id: eventId } } : { slug: data.slug },
  });
  if (existingSlug) return { fieldErrors: { slug: "Deze slug is al in gebruik" } };

  const intentRaw = formData.get("intent");
  const intent: Intent =
    intentRaw === "publish" ? "publish" : intentRaw === "publish-questions" ? "publish-questions" : "draft";
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
  const validatedEarlybirdPrices: {
    clientKey: string;
    id?: string;
    deadline: Date;
    price: number;
    passengerPrice: number | null;
  }[] = [];
  for (const tier of draftEarlybirdPrices) {
    if (!tier.deadline) {
      earlybirdErrors[tier.clientKey] = "Kies een deadline";
      continue;
    }
    const tierDeadline = new Date(tier.deadline);
    if (Number.isNaN(tierDeadline.getTime())) {
      earlybirdErrors[tier.clientKey] = "Ongeldige deadline";
      continue;
    }
    const price = Number(tier.price);
    if (!tier.price || Number.isNaN(price) || price <= 0) {
      earlybirdErrors[tier.clientKey] = "Geef een prijs groter dan 0 op";
      continue;
    }
    // Blank means "no separate earlybird for passengers" — the event's
    // regular passenger price then applies for this tier (see lib/pricing.ts).
    const rawPassenger = (tier.passengerPrice ?? "").trim();
    let passengerPrice: number | null = null;
    if (rawPassenger) {
      const parsed = Number(rawPassenger);
      if (Number.isNaN(parsed) || parsed < 0) {
        earlybirdErrors[tier.clientKey] = "Ongeldige passagiersprijs";
        continue;
      }
      passengerPrice = parsed;
    }
    validatedEarlybirdPrices.push({ clientKey: tier.clientKey, id: tier.id, deadline: tierDeadline, price, passengerPrice });
  }
  if (Object.keys(earlybirdErrors).length > 0) return { earlybirdErrors };

  const contentFields: Omit<EventDraftData, "coverImagePath"> = {
    name: data.name,
    slug: data.slug,
    description: data.description,
    date: data.date,
    endDate: data.endDate ?? null,
    distanceKm: data.distanceKm ?? null,
    durationMinutes: data.durationMinutes ?? null,
    price: data.price ?? null,
    passengerPrice: data.passengerPrice ?? null,
    maxPassengers: data.maxPassengers,
    // Left blank, fall back to a suggestion built from the submitted name and
    // date — that is what makes "leave it empty" do the sensible thing rather
    // than silently reverting the event to random codes.
    paymentReferencePrefix: data.paymentReferencePrefix || suggestPaymentPrefix(data.name, data.date),
    registrationStartDate: data.registrationStartDate ?? null,
    registrationEndDate: data.registrationEndDate ?? null,
  };

  const coverImage = formData.get("coverImage");
  const newUploadedCoverPath =
    coverImage instanceof File && coverImage.size > 0 ? await saveUploadedFile(coverImage, "events/covers") : null;

  const current = eventId ? await prisma.event.findUniqueOrThrow({ where: { id: eventId } }) : null;
  const wasPublished = current?.published === true;
  const currentDraft = (current?.draftData as EventDraftData | null) ?? null;
  const applyContentLive = intent === "publish";

  let resolvedEventId = eventId;

  if (!current) {
    // Brand new event — everything saves live immediately, there's no
    // public audience to protect yet.
    const coverImagePath = newUploadedCoverPath ?? undefined;
    const created = await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          name: contentFields.name,
          slug: contentFields.slug,
          description: contentFields.description,
          date: new Date(contentFields.date),
          endDate: contentFields.endDate ? new Date(contentFields.endDate) : null,
          distanceKm: contentFields.distanceKm,
          durationMinutes: contentFields.durationMinutes,
          price: contentFields.price,
          passengerPrice: contentFields.passengerPrice,
          maxPassengers: contentFields.maxPassengers,
          paymentReferencePrefix: contentFields.paymentReferencePrefix,
          registrationStartDate: contentFields.registrationStartDate
            ? new Date(contentFields.registrationStartDate)
            : null,
          registrationEndDate: contentFields.registrationEndDate ? new Date(contentFields.registrationEndDate) : null,
          published: intent === "publish" ? true : data.published,
          registrationOpen: data.registrationOpen,
          coverImagePath,
        },
      });

      const form = await tx.eventQuestionForm.create({
        data: { eventId: event.id, deadline, responsesOpen },
      });

      for (let index = 0; index < validatedQuestions.length; index++) {
        const q = validatedQuestions[index];
        await tx.eventQuestion.create({
          data: {
            formId: form.id,
            type: q.type,
            label: q.label,
            required: q.required,
            perPassenger: q.perPassenger,
            options: q.options,
            order: index,
          },
        });
      }

      for (const tier of validatedEarlybirdPrices) {
        await tx.earlybirdPrice.create({
          data: { eventId: event.id, deadline: tier.deadline, price: tier.price, passengerPrice: tier.passengerPrice },
        });
      }

      return event;
    });

    revalidatePath("/admin/events");
    revalidatePath("/");
    redirect(`/admin/events/${created.id}/edit`);
  }

  resolvedEventId = current!.id;

  // Existing event — figure out where the content fields go: straight to
  // the live columns (never published yet, or this save is a "publish"),
  // or staged into draftData (already published, admin just wants to save
  // for now). Cover-image bookkeeping follows the same split, and cleans up
  // any now-unreferenced uploaded file so drafts don't leak storage.
  let liveCoverImagePath = current!.coverImagePath;
  let nextDraftData: EventDraftData | null = currentDraft;

  if (!wasPublished || applyContentLive) {
    const finalCoverImagePath = newUploadedCoverPath ?? currentDraft?.coverImagePath ?? current!.coverImagePath;
    if (finalCoverImagePath !== current!.coverImagePath && current!.coverImagePath) {
      await storage.delete(current!.coverImagePath);
    }
    // A queued draft cover that isn't the one we ended up applying is now
    // orphaned (e.g. a fresh upload in this very save superseded it).
    if (
      currentDraft?.coverImagePath &&
      currentDraft.coverImagePath !== finalCoverImagePath &&
      currentDraft.coverImagePath !== current!.coverImagePath
    ) {
      await storage.delete(currentDraft.coverImagePath);
    }
    liveCoverImagePath = finalCoverImagePath;
    nextDraftData = null;
  } else {
    // Staging: keep the live cover image untouched, only remember a new
    // upload inside the draft snapshot. A previously queued draft cover
    // that's being replaced by a newer upload gets cleaned up.
    if (newUploadedCoverPath && currentDraft?.coverImagePath && currentDraft.coverImagePath !== newUploadedCoverPath) {
      await storage.delete(currentDraft.coverImagePath);
    }
    const draftCoverImagePath = newUploadedCoverPath ?? currentDraft?.coverImagePath;
    nextDraftData = {
      ...contentFields,
      ...(draftCoverImagePath ? { coverImagePath: draftCoverImagePath } : {}),
    };
  }

  const existingQuestions = await prisma.eventQuestion.findMany({ where: { formId: formId! }, select: { id: true } });
  const keepIds = new Set(validatedQuestions.map((q) => q.id).filter((id): id is string => Boolean(id)));
  const idsToDelete = existingQuestions.filter((q) => !keepIds.has(q.id)).map((q) => q.id);

  const existingEarlybirdPrices = await prisma.earlybirdPrice.findMany({
    where: { eventId: resolvedEventId! },
    select: { id: true },
  });
  const keepEarlybirdIds = new Set(validatedEarlybirdPrices.map((t) => t.id).filter((id): id is string => Boolean(id)));
  const earlybirdIdsToDelete = existingEarlybirdPrices.filter((t) => !keepEarlybirdIds.has(t.id)).map((t) => t.id);

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: resolvedEventId! },
      data: {
        ...(!wasPublished || applyContentLive
          ? {
              name: contentFields.name,
              slug: contentFields.slug,
              description: contentFields.description,
              date: new Date(contentFields.date),
              endDate: contentFields.endDate ? new Date(contentFields.endDate) : null,
              distanceKm: contentFields.distanceKm,
              durationMinutes: contentFields.durationMinutes,
              price: contentFields.price,
              passengerPrice: contentFields.passengerPrice,
              maxPassengers: contentFields.maxPassengers,
              paymentReferencePrefix: contentFields.paymentReferencePrefix,
              registrationStartDate: contentFields.registrationStartDate
                ? new Date(contentFields.registrationStartDate)
                : null,
              registrationEndDate: contentFields.registrationEndDate
                ? new Date(contentFields.registrationEndDate)
                : null,
            }
          : {}),
        coverImagePath: liveCoverImagePath,
        draftData: nextDraftData ?? Prisma.JsonNull,
        // published/registrationOpen are plain switches, not "content" —
        // they always take effect immediately regardless of draft state.
        published: intent === "publish" ? true : data.published,
        registrationOpen: data.registrationOpen,
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
            formId: formId!,
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
        await tx.earlybirdPrice.update({
          where: { id: tier.id },
          data: { deadline: tier.deadline, price: tier.price, passengerPrice: tier.passengerPrice },
        });
      } else {
        await tx.earlybirdPrice.create({
          data: { eventId: resolvedEventId!, deadline: tier.deadline, price: tier.price, passengerPrice: tier.passengerPrice },
        });
      }
    }

    await tx.eventQuestionForm.update({
      where: { id: formId! },
      data: {
        deadline,
        responsesOpen,
        ...(intent === "publish-questions" ? { published: true, publishedAt: new Date() } : {}),
      },
    });
  });

  if (intent === "publish-questions") {
    await notifyRegistrantsOfPublish(resolvedEventId!);
  }

  revalidatePath(`/admin/events/${resolvedEventId}/edit`);
  revalidatePath("/admin/events");
  revalidatePath(`/events/${contentFields.slug}`);
  revalidatePath("/");

  const [freshQuestions, freshForm, freshEarlybirdPrices] = await Promise.all([
    prisma.eventQuestion.findMany({ where: { formId: formId! }, orderBy: { order: "asc" } }),
    prisma.eventQuestionForm.findUniqueOrThrow({ where: { id: formId! } }),
    prisma.earlybirdPrice.findMany({ where: { eventId: resolvedEventId! }, orderBy: { deadline: "asc" } }),
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
      passengerPrice: t.passengerPrice?.toString() ?? null,
    })),
    questionsPublished: freshForm.published,
    deadline: freshForm.deadline ? freshForm.deadline.toISOString().slice(0, 10) : null,
    responsesOpen: freshForm.responsesOpen,
    hasDraft: nextDraftData !== null,
    savedAt: Date.now(),
  };
}

export async function discardEventDraft(eventId: string): Promise<void> {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const draft = event.draftData as EventDraftData | null;
  if (!draft) return;

  if (draft.coverImagePath && draft.coverImagePath !== event.coverImagePath) {
    await storage.delete(draft.coverImagePath);
  }

  await prisma.event.update({ where: { id: eventId }, data: { draftData: Prisma.JsonNull } });
  revalidatePath(`/admin/events/${eventId}/edit`);
}
