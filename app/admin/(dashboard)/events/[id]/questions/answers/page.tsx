import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AnswersTable from "@/components/admin/AnswersTable";
import { getExpectedAmount, getPaymentBalance } from "@/lib/payments";
import { groupAnswersByQuestion, passengerLabel } from "@/lib/questionForms";

export default async function EventAnswersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      questionForm: { include: { questions: { orderBy: { order: "asc" } } } },
      registrations: {
        where: { paymentStatus: { not: "CANCELLED" } },
        include: { participant: true, answers: { include: { question: true } }, payments: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!event) notFound();

  const questions = event.questionForm?.questions ?? [];
  const selectQuestions = questions.filter((q) => q.type === "SELECT");

  const registrationsWithPaid = event.registrations.map((registration) => {
    const expected = getExpectedAmount(registration);
    const received = registration.payments.reduce((sum, p) => sum + Number(p.amount.toString()), 0);
    const balance = getPaymentBalance(received, expected);
    const paid = balance === "PAID" || balance === "OVERPAID";
    return { registration, paid };
  });

  const paidCount = registrationsWithPaid.filter((r) => r.paid).length;
  const unpaidRegistrations = registrationsWithPaid.filter((r) => !r.paid);

  const aggregates = selectQuestions.map((question) => {
    const options = Array.isArray(question.options) ? (question.options as string[]) : [];
    const paidCounts = new Map<string, number>(options.map((option) => [option, 0]));
    const unpaidCounts = new Map<string, number>(options.map((option) => [option, 0]));

    for (const { registration, paid } of registrationsWithPaid) {
      const personCount = question.perPassenger ? registration.passengerCount + 1 : 1;
      for (let passengerIndex = 0; passengerIndex < personCount; passengerIndex++) {
        const answer = registration.answers.find(
          (a) => a.questionId === question.id && a.passengerIndex === passengerIndex,
        );
        if (!answer || !paidCounts.has(answer.value)) continue;
        const counts = paid ? paidCounts : unpaidCounts;
        counts.set(answer.value, (counts.get(answer.value) ?? 0) + 1);
      }
    }

    const max = Math.max(1, ...options.map((o) => (paidCounts.get(o) ?? 0) + (unpaidCounts.get(o) ?? 0)));
    return {
      question,
      max,
      counts: options.map((option) => ({
        option,
        paid: paidCounts.get(option) ?? 0,
        unpaid: unpaidCounts.get(option) ?? 0,
      })),
    };
  });

  const rows = registrationsWithPaid.map(({ registration, paid }) => ({
    registrationId: registration.id,
    participant: `${registration.participant.username} · ${registration.participant.email}`,
    vehicle: `${registration.vehicleMake} ${registration.vehicleModel}`,
    paid,
    answers: Object.fromEntries(
      groupAnswersByQuestion(registration.answers).map(({ question, entries }) => {
        const formatted = entries
          .map(({ passengerIndex, value }) =>
            question.perPassenger ? `${passengerLabel(passengerIndex)}: ${value}` : value,
          )
          .join(" · ");
        return [question.id, formatted];
      }),
    ),
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

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{paidCount}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">betaald</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-2xl font-semibold text-amber-700 dark:text-amber-400">{unpaidRegistrations.length}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">nog niet betaald</div>
        </div>
      </div>

      {unpaidRegistrations.length > 0 ? (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-300">Nog niet betaald</div>
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
            {unpaidRegistrations.map(({ registration }) => (
              <li key={registration.id}>
                <Link
                  href={`/admin/events/${id}/registrations`}
                  className="underline decoration-dotted hover:decoration-solid"
                >
                  {registration.participant.username} · {registration.participant.email}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
                    {counts.map(({ option, paid, unpaid }) => (
                      <div key={option}>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>{option}</span>
                          <span>
                            {paid + unpaid} ({paid} betaald, {unpaid} nog niet)
                          </span>
                        </div>
                        <div className="flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                          <div
                            className="h-full bg-emerald-600"
                            style={{ width: `${(paid / max) * 100}%` }}
                          />
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${(unpaid / max) * 100}%` }}
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
