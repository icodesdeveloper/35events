import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

const isConfigured = Boolean(SMTP_HOST && SMTP_PORT && SMTP_FROM);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      // Nodemailer's defaults are generous (2 min to connect, 10 min socket).
      // A mail server that stops answering would otherwise hold a request
      // open for minutes — which is exactly what made registration seem to
      // hang before redirecting to the success page.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })
  : null;

export type MailOptions = { to: string; subject: string; html: string; text: string; source?: string };

// `queued` means the SMTP server refused or was unreachable and the mail is
// now sitting in OutboundMail for lib/notifications/outbox.ts to retry — the
// caller should tell the user it will go out later rather than pretend it
// was sent.
export type MailResult = { delivered: boolean; queued: boolean };

async function deliver(options: MailOptions): Promise<void> {
  if (!transporter) {
    // No SMTP configured yet — log instead of failing, so local dev/testing
    // of the magic-link and registration-confirmation flows works before
    // SMTP_* env vars are filled in.
    console.log(`\n[mail] SMTP not configured — would send to ${options.to}:\n${options.subject}\n${options.text}\n`);
    return;
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

// Single funnel for every mail the app sends. Tries SMTP once; on failure the
// message is persisted rather than dropped, so nothing is silently lost when
// the mail server is down.
export async function sendMail(options: MailOptions): Promise<MailResult> {
  try {
    await deliver(options);
    return { delivered: true, queued: false };
  } catch (error) {
    await prisma.outboundMail
      .create({
        data: {
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
          source: options.source ?? null,
          attempts: 1,
          lastAttemptAt: new Date(),
          lastError: error instanceof Error ? error.message : String(error),
        },
      })
      .catch((queueError) => {
        // Losing the queue write too is the one case where the mail really is
        // gone; make that loud rather than silent.
        console.error(`[mail] kon mail naar ${options.to} niet versturen én niet in de wachtrij zetten:`, queueError);
      });

    console.warn(`[mail] verzenden naar ${options.to} mislukt — in wachtrij gezet voor een nieuwe poging.`);
    return { delivered: false, queued: true };
  }
}

// For mail a user should never have to wait on. A confirmation mail is
// best-effort — its failure is already handled by the queue above — so making
// someone stare at a spinner while SMTP is slow just turns a mail problem
// into a broken registration. The app runs as one persistent process, so the
// send simply continues after the response has gone out.
export function sendMailInBackground(options: MailOptions): void {
  void sendMail(options).catch((error) => {
    console.error(`[mail] onverwachte fout bij ${options.to}:`, error);
  });
}
