import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

const isConfigured = Boolean(SMTP_HOST && SMTP_PORT && SMTP_FROM);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

export async function sendMail(options: { to: string; subject: string; html: string; text: string }) {
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
