import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/transporter";
import { extraInfoRequestEmail, extraInfoReminderEmail } from "@/lib/mail/templates";
import { SITE_URL } from "@/lib/site";
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

function extraInfoUrl(registrationId: string): string {
  return `${SITE_URL}/account/registrations/${registrationId}/extra-info`;
}

// Called by saveEventEdit (app/admin/(dashboard)/events/[id]/edit/actions.ts)
// on every draft -> published transition — mails every current registrant,
// and resets extraInfoReminderSentAt so a new reminder cycle can run against
// whatever deadline was just (re)published.
export async function notifyRegistrantsOfPublish(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { questionForm: true, registrations: { include: { participant: true } } },
  });
  if (!event?.questionForm) return;

  for (const registration of event.registrations) {
    const { subject, text, html } = extraInfoRequestEmail(
      event.name,
      extraInfoUrl(registration.id),
      event.questionForm.deadline,
    );
    await sendMail({ to: registration.participant.email, subject, text, html }).catch(() => {});
  }

  await prisma.registration.updateMany({
    where: { eventId },
    data: { extraInfoNotifiedAt: new Date(), extraInfoReminderSentAt: null },
  });
}

async function isRegistrationComplete(registrationId: string, requiredQuestionIds: string[]): Promise<boolean> {
  if (requiredQuestionIds.length === 0) return true;
  const answeredCount = await prisma.eventQuestionAnswer.count({
    where: { registrationId, questionId: { in: requiredQuestionIds } },
  });
  return answeredCount >= requiredQuestionIds.length;
}

// Called hourly by the scheduler set up in instrumentation.ts. Safe to call
// as often as needed — extraInfoReminderSentAt makes it idempotent per
// published deadline, so a missed tick (e.g. server restart) just gets
// caught on the next one instead of silently skipping anyone.
export async function runExtraInfoReminderCheck(): Promise<void> {
  const now = new Date();
  const reminderWindowEnd = new Date(now.getTime() + FOUR_DAYS_MS);

  const forms = await prisma.eventQuestionForm.findMany({
    where: {
      published: true,
      deadline: { gte: now, lte: reminderWindowEnd },
    },
    include: {
      questions: true,
      event: { include: { registrations: { include: { participant: true } } } },
    },
  });

  for (const form of forms) {
    const requiredQuestionIds = form.questions.filter((q) => q.required).map((q) => q.id);

    for (const registration of form.event.registrations) {
      if (registration.extraInfoReminderSentAt) continue;

      const complete = await isRegistrationComplete(registration.id, requiredQuestionIds);
      if (complete) continue;

      const { subject, text, html } = extraInfoReminderEmail(
        form.event.name,
        extraInfoUrl(registration.id),
        form.deadline,
      );
      await sendMail({ to: registration.participant.email, subject, text, html }).catch(() => {});

      await prisma.registration.update({
        where: { id: registration.id },
        data: { extraInfoReminderSentAt: new Date() },
      });
    }
  }
}
