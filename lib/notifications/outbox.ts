import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/transporter";

// Retries mail that could not be delivered. Runs hourly from
// instrumentation.ts and again on boot, so a backlog built up while the mail
// server was down drains by itself once it comes back — and survives a
// restart, because the queue lives in the database rather than in memory.
//
// A retry that fails goes through sendMail again, which would queue a *new*
// row; the existing row is deleted first and re-created by that path, so the
// attempt counter is carried over rather than restarting at 1.
const BATCH_SIZE = 25;

export type OutboxRunResult = { attempted: number; delivered: number; stillQueued: number };

export async function runOutboxCheck(): Promise<OutboxRunResult> {
  const pending = await prisma.outboundMail.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });
  if (pending.length === 0) return { attempted: 0, delivered: 0, stillQueued: 0 };

  let delivered = 0;
  let stillQueued = 0;

  for (const mail of pending) {
    // Remove first so a failed retry does not leave two rows for the same
    // message once sendMail re-queues it.
    await prisma.outboundMail.delete({ where: { id: mail.id } }).catch(() => {});

    const result = await sendMail({
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      source: mail.source ?? undefined,
    });

    if (result.delivered) {
      delivered += 1;
    } else {
      stillQueued += 1;
      // sendMail created a fresh row with attempts = 1; fold the previous
      // attempts back in so the admin can see how long this has been stuck.
      await prisma.outboundMail
        .updateMany({
          where: { to: mail.to, subject: mail.subject, status: "PENDING", attempts: 1 },
          data: { attempts: mail.attempts + 1, createdAt: mail.createdAt },
        })
        .catch(() => {});
    }
  }

  if (delivered > 0 || stillQueued > 0) {
    console.log(`[outbox] ${delivered} alsnog verzonden, ${stillQueued} nog in wachtrij.`);
  }
  return { attempted: pending.length, delivered, stillQueued };
}

export async function getOutboxCount(): Promise<number> {
  return prisma.outboundMail.count({ where: { status: "PENDING" } });
}
