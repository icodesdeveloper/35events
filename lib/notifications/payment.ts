import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/transporter";
import { paymentConfirmedEmail } from "@/lib/mail/templates";
import { isRegistrationComplete, type PassengerQuestion } from "@/lib/questionForms";
import type { QuestionType } from "@/lib/validation/question";
import { SITE_URL } from "@/lib/site";

// Called whenever a registration's paymentStatus transitions into CONFIRMED
// (see app/admin/(dashboard)/payments/actions.ts and
// app/admin/(dashboard)/events/[id]/registrations/actions.ts) — tells the
// participant their payment is settled, and flags any still-open bijkomende
// vragen so they don't assume everything is done.
export async function notifyPaymentConfirmed(registrationId: string): Promise<void> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      participant: true,
      event: { include: { questionForm: { include: { questions: true } } } },
      answers: true,
    },
  });
  if (!registration) return;

  const form = registration.event.questionForm;
  const questions: PassengerQuestion[] =
    form?.published
      ? form.questions.map((q) => ({
          id: q.id,
          type: q.type as QuestionType,
          label: q.label,
          required: q.required,
          perPassenger: q.perPassenger,
          options: Array.isArray(q.options) ? (q.options as string[]) : null,
        }))
      : [];
  const answersComplete = isRegistrationComplete(questions, registration.passengerCount, registration.answers);

  const { subject, text, html } = paymentConfirmedEmail(registration.event.name, `${SITE_URL}/account`, answersComplete);
  await sendMail({ to: registration.participant.email, subject, text, html }).catch(() => {});
}
