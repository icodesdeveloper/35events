import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EventEditWorkspace from "@/components/admin/EventEditWorkspace";
import { ensureQuestionForm } from "@/app/admin/(dashboard)/events/[id]/questions/actions";
import type { QuestionItem, EarlybirdPriceItem } from "@/app/admin/(dashboard)/events/[id]/edit/actions";

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

  return (
    <EventEditWorkspace
      eventId={event.id}
      formId={form.id}
      event={{
        ...event,
        price: event.price?.toString() ?? null,
        passengerPrice: event.passengerPrice?.toString() ?? null,
      }}
      initialQuestions={items}
      initialDeadline={form.deadline ? form.deadline.toISOString().slice(0, 10) : null}
      initialPublished={form.published}
      initialResponsesOpen={form.responsesOpen}
      initialEarlybirdPrices={earlybirdItems}
    />
  );
}
