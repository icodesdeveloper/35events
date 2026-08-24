import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth as participantAuth } from "@/lib/auth/participant";
import ExtraInfoForm from "@/components/forms/ExtraInfoForm";
import { getExtraInfoAvailability, EXTRA_INFO_CLOSED_MESSAGE } from "@/lib/questionForms";

export default async function ExtraInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await participantAuth();
  if (!session?.user?.participantId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/account/registrations/${id}/extra-info`)}`);
  }

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: {
      event: { include: { questionForm: { include: { questions: { orderBy: { order: "asc" } } } } } },
      answers: true,
    },
  });
  if (!registration || registration.participantId !== session.user.participantId) notFound();

  const form = registration.event.questionForm;
  if (!form || form.questions.length === 0) redirect("/account");

  const answersByQuestion = new Map(registration.answers.map((answer) => [answer.questionId, answer.value]));
  const availability = getExtraInfoAvailability(form);

  if (!availability.open) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 md:px-8">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-white">Bijkomende informatie</h1>
        <p className="mb-6 text-slate-600 dark:text-slate-300">{registration.event.name}</p>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {EXTRA_INFO_CLOSED_MESSAGE[availability.reason]}
        </div>

        {registration.answers.length > 0 ? (
          <div className="mt-6 space-y-3">
            {form.questions.map((question) => (
              <div key={question.id}>
                <div className="text-sm font-medium text-zinc-900 dark:text-white">{question.label}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {answersByQuestion.get(question.id) || "—"}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 md:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-white">Bijkomende informatie</h1>
      <p className="mb-8 text-slate-600 dark:text-slate-300">{registration.event.name}</p>
      <ExtraInfoForm
        registrationId={registration.id}
        questions={form.questions.map((question) => ({
          id: question.id,
          type: question.type,
          label: question.label,
          required: question.required,
          options: Array.isArray(question.options) ? (question.options as string[]) : null,
          defaultValue: answersByQuestion.get(question.id) ?? "",
        }))}
      />
    </div>
  );
}
