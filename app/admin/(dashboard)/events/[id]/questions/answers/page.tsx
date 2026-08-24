import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AnswersTable from "@/components/admin/AnswersTable";

export default async function EventAnswersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      questionForm: { include: { questions: { orderBy: { order: "asc" } } } },
      registrations: {
        include: { participant: true, answers: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!event) notFound();

  const questions = event.questionForm?.questions ?? [];
  const selectQuestions = questions.filter((q) => q.type === "SELECT");

  const aggregates = selectQuestions.map((question) => {
    const options = Array.isArray(question.options) ? (question.options as string[]) : [];
    const counts = new Map<string, number>(options.map((option) => [option, 0]));
    for (const registration of event.registrations) {
      const answer = registration.answers.find((a) => a.questionId === question.id);
      if (answer && counts.has(answer.value)) counts.set(answer.value, (counts.get(answer.value) ?? 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    return {
      question,
      max,
      counts: options.map((option) => ({ option, count: counts.get(option) ?? 0 })),
    };
  });

  const rows = event.registrations.map((registration) => ({
    registrationId: registration.id,
    participant: `${registration.participant.username} · ${registration.participant.email}`,
    vehicle: `${registration.vehicleMake} ${registration.vehicleModel}`,
    answers: Object.fromEntries(registration.answers.map((a) => [a.questionId, a.value])),
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">{event.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Antwoorden op bijkomende vragen</p>
        </div>
        <Link
          href={`/admin/events/${id}/edit#vragen`}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
        >
          Vragen bewerken
        </Link>
      </div>

      {questions.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">Dit event heeft nog geen bijkomende vragen.</p>
      ) : (
        <>
          {aggregates.length > 0 ? (
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {aggregates.map(({ question, counts, max }) => (
                <div
                  key={question.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-3 text-sm font-medium text-zinc-900 dark:text-white">{question.label}</div>
                  <div className="space-y-2">
                    {counts.map(({ option, count }) => (
                      <div key={option}>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>{option}</span>
                          <span>{count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-zinc-900 dark:bg-white"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <AnswersTable columns={questions.map((q) => ({ id: q.id, label: q.label }))} rows={rows} />
        </>
      )}
    </div>
  );
}
