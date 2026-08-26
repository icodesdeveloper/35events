import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EventEditWorkspace from "@/components/admin/EventEditWorkspace";
import { ensureQuestionForm } from "@/app/admin/(dashboard)/events/[id]/questions/actions";
import type { QuestionItem, EarlybirdPriceItem, EventDraftData } from "@/app/admin/(dashboard)/events/[id]/edit/actions";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const form = await ensureQuestionForm(id);
  const [questions, earlybirdPrices] = await Promise.all([
    prisma.eventQuestion.findMany({ where: { formId: form.id }, orderBy: { order: "asc" } }),
    prisma.earlybirdPrice.findMany({ where: { eventId: id }, orderBy: { deadline: "asc" } }),
  ]);

  const items: QuestionItem[] = questions.map((q) => ({
    id: q.id,
    type: q.type as QuestionItem["type"],
    label: q.label,
    required: q.required,
    perPassenger: q.perPassenger,
    options: Array.isArray(q.options) ? (q.options as string[]) : null,
    order: q.order,
  }));

  const earlybirdItems: EarlybirdPriceItem[] = earlybirdPrices.map((t) => ({
    id: t.id,
    deadline: t.deadline.toISOString().slice(0, 10),
    price: t.price.toString(),
  }));

  // If there's a pending, unpublished draft, show ITS values in the form
  // instead of the live ones, so the admin resumes editing what they last
  // staged rather than seeing the (still) published content.
  const draft = event.draftData as EventDraftData | null;
  const displayEvent = draft
    ? {
        ...event,
        name: draft.name,
        slug: draft.slug,
        description: draft.description,
        date: new Date(draft.date),
        endDate: draft.endDate ? new Date(draft.endDate) : null,
        distanceKm: draft.distanceKm,
        durationMinutes: draft.durationMinutes,
        price: draft.price,
        passengerPrice: draft.passengerPrice,
        maxPassengers: draft.maxPassengers,
        registrationStartDate: draft.registrationStartDate ? new Date(draft.registrationStartDate) : null,
        registrationEndDate: draft.registrationEndDate ? new Date(draft.registrationEndDate) : null,
        coverImagePath: draft.coverImagePath ?? event.coverImagePath,
      }
    : event;

  return (
    <EventEditWorkspace
      eventId={event.id}
      formId={form.id}
      event={{
        ...displayEvent,
        price: displayEvent.price?.toString() ?? null,
        passengerPrice: displayEvent.passengerPrice?.toString() ?? null,
      }}
      initialQuestions={items}
      initialDeadline={form.deadline ? form.deadline.toISOString().slice(0, 10) : null}
      initialQuestionsPublished={form.published}
      initialResponsesOpen={form.responsesOpen}
      initialEarlybirdPrices={earlybirdItems}
      initialHasDraft={draft !== null}
    />
  );
}
