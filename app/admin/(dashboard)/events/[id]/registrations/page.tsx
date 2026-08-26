import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faCar } from "@fortawesome/free-solid-svg-icons";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { updatePaymentStatus, deleteRegistration } from "@/app/admin/(dashboard)/events/[id]/registrations/actions";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import Tooltip from "@/components/admin/Tooltip";
import { getExpectedAmount, getPaymentBalance, PAYMENT_BALANCE_LABEL, type PaymentStatus } from "@/lib/payments";
import { groupAnswersByQuestion, passengerLabel } from "@/lib/questionForms";
import ManualRegistrationForm from "@/components/admin/ManualRegistrationForm";

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "PENDING_PAYMENT", label: "In afwachting" },
  { value: "CONFIRMED", label: "Bevestigd" },
  { value: "CANCELLED", label: "Geannuleerd" },
];

export default async function EventRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, allParticipants] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        registrations: {
          include: { participant: true, answers: { include: { question: true } }, payments: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.participant.findMany({ select: { id: true, username: true, email: true }, orderBy: { username: "asc" } }),
  ]);
  if (!event) notFound();

  const registeredParticipantIds = new Set(event.registrations.map((r) => r.participantId));
  const eligibleParticipants = allParticipants.filter((p) => !registeredParticipantIds.has(p.id));

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-white">{event.name}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Registraties</p>

      <ManualRegistrationForm eventId={event.id} participants={eligibleParticipants} maxPassengers={event.maxPassengers} />

      {event.registrations.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">Nog geen registraties voor dit event.</p>
      ) : (
        <div className="space-y-4">
          {event.registrations.map((registration) => {
            const expected = getExpectedAmount(registration);
            const received = registration.payments.reduce((sum, payment) => sum + Number(payment.amount.toString()), 0);
            const balance = getPaymentBalance(received, expected);
            return (
            <div
              key={registration.id}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-center gap-4">
                {registration.vehiclePhotoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element -- served via app/api/media
                  <img
                    src={`/api/media/${registration.vehiclePhotoPath}`}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-slate-500">
                    <FontAwesomeIcon icon={faCar} className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-48 flex-1">
                  <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-white">
                    {registration.participant.username} · {registration.participant.email}
                    {registration.addedManually ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-zinc-800 dark:text-slate-400">
                        Manueel toegevoegd
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {registration.vehicleMake} {registration.vehicleModel}
                    {registration.vehicleType ? ` (${registration.vehicleType})` : ""}
                    {registration.passengerCount > 0
                      ? ` · ${registration.passengerCount} passagier${registration.passengerCount > 1 ? "s" : ""}`
                      : ""}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {registration.priceSnapshot != null ? formatPrice(registration.priceSnapshot.toString()) : "—"}
                    {registration.passengerCount > 0 && registration.passengerPriceSnapshot != null
                      ? ` + ${registration.passengerCount} × ${formatPrice(registration.passengerPriceSnapshot.toString())} passagiers`
                      : ""}
                    {registration.discountAmountSnapshot != null
                      ? ` − ${formatPrice(registration.discountAmountSnapshot.toString())} korting`
                      : ""}
                    {registration.paymentReference && expected > 0 ? (
                      <>
                        {" · code "}
                        <span className="font-mono text-zinc-700 dark:text-slate-300">
                          {registration.paymentReference}
                        </span>
                        {" · "}
                        {formatPrice(received)} / {formatPrice(expected)} ({PAYMENT_BALANCE_LABEL[balance].toLowerCase()})
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <form key={option.value} action={updatePaymentStatus.bind(null, event.id, registration.id, option.value)}>
                      <button
                        type="submit"
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          registration.paymentStatus === option.value
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                            : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400"
                        }`}
                      >
                        {option.label}
                      </button>
                    </form>
                  ))}
                  <Tooltip label="Registratie verwijderen">
                    <form action={deleteRegistration.bind(null, event.id, registration.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Registratie van ${registration.participant.username} verwijderen? Dit kan niet ongedaan gemaakt worden — de deelnemer kan zich daarna wel opnieuw inschrijven voor dit event.`}
                        className="ml-1 rounded p-1.5 text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                        ariaLabel="Registratie verwijderen"
                      >
                        <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                      </ConfirmSubmitButton>
                    </form>
                  </Tooltip>
                </div>
              </div>

              {registration.answers.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2 dark:border-zinc-800">
                  {groupAnswersByQuestion(registration.answers).map(({ question, entries }) => (
                    <div key={question.id} className="text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400 dark:text-slate-500">{question.label}: </span>
                      {entries
                        .map(({ passengerIndex, value }) =>
                          question.perPassenger ? `${passengerLabel(passengerIndex)}: ${value}` : value,
                        )
                        .join(" · ")}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
