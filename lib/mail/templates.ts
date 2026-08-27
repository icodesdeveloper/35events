import { renderEmailLayout, emailButton, emailMono } from "@/lib/mail/layout";

// Crude HTML → plain-text fallback for campaign mails — the body only ever
// contains the small allowlisted tag set from lib/sanitizeHtml.ts (the
// RichTextEditor can't produce anything else), so a regex pass is enough.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<(p|br|li|h[2-4]|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function campaignEmail(subject: string, bodyHtml: string) {
  const { html } = await renderEmailLayout({ preheader: subject, bodyHtml });
  return { subject, text: htmlToPlainText(bodyHtml), html };
}

export async function magicLinkEmail(url: string) {
  const { html } = await renderEmailLayout({
    preheader: "Je inloglink voor 35events",
    bodyHtml: `
      <p style="margin:0 0 16px;">Klik op de knop hieronder om in te loggen bij 35events.</p>
      <p style="margin:0 0 16px;">${emailButton("Inloggen", url)}</p>
      <p style="margin:0 0 8px;font-size:13px;">Of kopieer deze link: <a href="${url}" style="color:#c9a574;">${url}</a></p>
      <p style="margin:0;font-size:13px;color:#a1a1aa;">Deze link is 24 uur geldig.</p>
    `,
  });
  return {
    subject: "Je inloglink voor 35events",
    text: `Klik op deze link om in te loggen bij 35events:\n\n${url}\n\nDeze link is 24 uur geldig.`,
    html,
  };
}

function formatDeadline(deadline: Date | null): string {
  if (!deadline) return "";
  return new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", year: "numeric" }).format(deadline);
}

export async function extraInfoRequestEmail(eventName: string, url: string, deadline: Date | null) {
  const deadlineText = deadline ? ` Gelieve dit in te vullen vóór ${formatDeadline(deadline)}.` : "";
  const { html } = await renderEmailLayout({
    preheader: `Bijkomende info nodig voor ${eventName}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">We hebben nog bijkomende informatie nodig voor je registratie voor <strong>${eventName}</strong>.${deadlineText}</p>
      <p style="margin:0;">${emailButton("Vul aan", url)}</p>
    `,
  });
  return {
    subject: `Bijkomende info nodig — ${eventName}`,
    text: `We hebben nog bijkomende informatie nodig voor je registratie voor "${eventName}".${deadlineText}\n\nVul aan via: ${url}`,
    html,
  };
}

export async function extraInfoReminderEmail(eventName: string, url: string, deadline: Date | null) {
  const deadlineText = deadline ? ` vóór ${formatDeadline(deadline)}` : "";
  const { html } = await renderEmailLayout({
    preheader: `Herinnering: bijkomende info nodig voor ${eventName}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Herinnering: gelieve de bijkomende informatie voor <strong>${eventName}</strong> in te vullen${deadlineText}.</p>
      <p style="margin:0;">${emailButton("Vul aan", url)}</p>
    `,
  });
  return {
    subject: `Herinnering: bijkomende info nodig — ${eventName}`,
    text: `Herinnering: gelieve de bijkomende informatie voor "${eventName}" in te vullen${deadlineText}.\n\nVul aan via: ${url}`,
    html,
  };
}

export type BankAccountInfo = { iban: string | null; accountName: string | null };

function bankTransferInstructions(
  paymentReference: string,
  expectedAmount: number,
  bankAccount: BankAccountInfo,
): { text: string; html: string } {
  if (expectedAmount <= 0) {
    return { text: "Deze deelname is gratis.", html: "<p style=\"margin:0 0 16px;\">Deze deelname is gratis.</p>" };
  }

  const priceLine = `${expectedAmount.toFixed(2).replace(".", ",")} euro`;
  const { iban, accountName } = bankAccount;

  if (!iban) {
    return {
      text: `Gelieve ${priceLine} over te schrijven met vermelding van code ${paymentReference}.`,
      html: `<p style="margin:0 0 16px;">Gelieve <strong>${priceLine}</strong> over te schrijven met vermelding van code ${emailMono(paymentReference)}.</p>`,
    };
  }

  const toLine = accountName ? `${iban} (${accountName})` : iban;
  return {
    text: `Gelieve ${priceLine} over te schrijven naar ${toLine} met vermelding van code ${paymentReference}.`,
    html: `<p style="margin:0 0 16px;">Gelieve <strong>${priceLine}</strong> over te schrijven naar <strong>${toLine}</strong> met vermelding van code ${emailMono(paymentReference)}.</p>`,
  };
}

export async function contactNotificationEmail(name: string, email: string, message: string) {
  const escapedMessage = message.replace(/\n/g, "<br>");
  const { html } = await renderEmailLayout({
    preheader: `Nieuwe contactaanvraag van ${name}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Nieuwe contactaanvraag via de website.</p>
      <p style="margin:0 0 16px;"><strong>Naam:</strong> ${name}<br><strong>E-mail:</strong> ${email}</p>
      <p style="margin:0;"><strong>Bericht:</strong><br>${escapedMessage}</p>
    `,
  });
  return {
    subject: `Nieuwe contactaanvraag van ${name}`,
    text: `Nieuwe contactaanvraag via de website.\n\nNaam: ${name}\nE-mail: ${email}\n\nBericht:\n${message}`,
    html,
  };
}

export async function contactConfirmationEmail(name: string) {
  const { html } = await renderEmailLayout({
    preheader: "Je contactaanvraag is ontvangen",
    bodyHtml: `
      <p style="margin:0 0 16px;">Hey ${name},</p>
      <p style="margin:0 0 16px;">Je contactaanvraag is gelukt! We hebben je bericht ontvangen en nemen zo snel mogelijk contact met je op.</p>
      <p style="margin:0;">Tot snel,<br>35events</p>
    `,
  });
  return {
    subject: "Je contactaanvraag is ontvangen",
    text: `Hey ${name},\n\nJe contactaanvraag is gelukt! We hebben je bericht ontvangen en nemen zo snel mogelijk contact met je op.\n\nTot snel,\n35events`,
    html,
  };
}

export async function registrationConfirmationEmail(
  eventName: string,
  accountUrl: string,
  paymentReference: string,
  expectedAmount: number,
  bankAccount: BankAccountInfo,
) {
  const instructions = bankTransferInstructions(paymentReference, expectedAmount, bankAccount);
  const { html } = await renderEmailLayout({
    preheader: `Registratie ontvangen voor ${eventName}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Je registratie voor <strong>${eventName}</strong> is ontvangen.</p>
      ${instructions.html}
      <p style="margin:0;">${emailButton("Bekijk je registratie", accountUrl)}</p>
    `,
  });
  return {
    subject: `Registratie ontvangen — ${eventName}`,
    text: `Je registratie voor "${eventName}" is ontvangen.\n\n${instructions.text}\n\nBekijk je registratie: ${accountUrl}`,
    html,
  };
}

export async function paymentConfirmedEmail(eventName: string, accountUrl: string, answersComplete: boolean) {
  const pendingLine = answersComplete
    ? ""
    : " Er staan trouwens nog bijkomende vragen open voor deze registratie — gelieve die ook nog in te vullen.";
  const pendingHtml = answersComplete
    ? ""
    : `<p style="margin:0 0 16px;">Er staan trouwens nog <strong>bijkomende vragen</strong> open voor deze registratie — gelieve die ook nog in te vullen.</p>`;
  const { html } = await renderEmailLayout({
    preheader: `Betaling ontvangen voor ${eventName}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Goed nieuws! Je betaling voor <strong>${eventName}</strong> is bevestigd, je deelname is helemaal in orde.</p>
      ${pendingHtml}
      <p style="margin:0;">${emailButton("Bekijk je registratie", accountUrl)}</p>
    `,
  });
  return {
    subject: `Betaling ontvangen — ${eventName}`,
    text: `Goed nieuws! Je betaling voor "${eventName}" is bevestigd, je deelname is helemaal in orde.${pendingLine}\n\nBekijk je registratie: ${accountUrl}`,
    html,
  };
}
