import Link from "next/link";
import { redirect } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faClipboardList } from "@fortawesome/free-solid-svg-icons";
import { auth, signOut } from "@/lib/auth/participant";
import { prisma } from "@/lib/prisma";
import { formatEventDate, formatPrice } from "@/lib/format";
import { getExpectedAmount, getPaymentBalance, type PaymentBalanceStatus } from "@/lib/payments";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Betaling in afwachting",
  CONFIRMED: "Bevestigd",
  CANCELLED: "Geannuleerd",
};

const PAYMENT_STATUS_CLASS: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400",
};

function paymentMessage(balance: PaymentBalanceStatus, expected: number, totalReceived: number): string {
  if (balance === "UNPAID") return `${formatPrice(expected)} te betalen`;
  if (balance === "PARTIAL")
    return `${formatPrice(expected - totalReceived)} nog te betalen (${formatPrice(totalReceived)} van ${formatPrice(expected)} ontvangen)`;
  if (balance === "OVERPAID") return `${formatPrice(totalReceived - expected)} te veel ontvangen — we nemen contact op`;
  return "";
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.participantId) redirect("/login?callbackUrl=/account");

  const registrations = await prisma.registration.findMany({
    where: { participantId: session.user.participantId },
    include: {
      event: { include: { questionForm: { include: { questions: true } } } },
      answers: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Mijn account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{session.user.email}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="text-sm font-medium text-slate-500 hover:text-zinc-900 dark:hover:text-white">
            Uitloggen
          </button>
        </form>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Mijn registraties</h2>
      {registrations.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">Je hebt nog geen registraties.</p>
      ) : (
        <div className="space-y-3">
          {registrations.map((registration) => {
            const form = registration.event.questionForm;
            const hasPublishedQuestions = Boolean(form?.published && form.questions.length > 0);
            const requiredQuestionIds = form?.questions.filter((q) => q.required).map((q) => q.id) ?? [];
            const answeredIds = new Set(registration.answers.map((a) => a.questionId));
            const isComplete = requiredQuestionIds.every((qId) => answeredIds.has(qId));

            const expectedAmount = getExpectedAmount(registration);
            const totalReceived = registration.payments.reduce((sum, payment) => sum + Number(payment.amount.toString()), 0);
            const balance = getPaymentBalance(totalReceived, expectedAmount);
            const showPaymentInfo =
              registration.paymentStatus !== "CANCELLED" && balance !== "PAID" && registration.paymentReference;

            return (
              <div
                key={registration.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-white">{registration.event.name}</div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <FontAwesomeIcon icon={faCalendar} className="h-3.5 w-3.5" />
                      {formatEventDate(registration.event.date, registration.event.endDate)}
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {registration.vehicleMake} {registration.vehicleModel}
                      {registration.hasPassenger ? " · met passagier" : ""}
                      {registration.priceSnapshot != null
                        ? ` · ${formatPrice(registration.priceSnapshot.toString())}`
                        : ""}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_STATUS_CLASS[registration.paymentStatus]}`}
                  >
                    {PAYMENT_STATUS_LABEL[registration.paymentStatus]}
                  </span>
                </div>

                {showPaymentInfo ? (
                  <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-zinc-800 dark:text-slate-300">
                    Betaalcode:{" "}
                    <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                      {registration.paymentReference}
                    </span>{" "}
                    · {paymentMessage(balance, expectedAmount, totalReceived)}
                  </div>
                ) : null}

                {hasPublishedQuestions ? (
                  <Link
                    href={`/account/registrations/${registration.id}/extra-info`}
                    className={`mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-sm font-medium dark:border-zinc-800 ${
                      isComplete
                        ? "text-slate-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-white"
                        : "text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                    }`}
                  >
                    <FontAwesomeIcon icon={faClipboardList} className="h-3.5 w-3.5" />
                    {isComplete ? "Bijkomende informatie bekijken/wijzigen" : "Bijkomende informatie invullen"}
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
