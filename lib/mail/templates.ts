export function magicLinkEmail(url: string) {
  return {
    subject: "Je inloglink voor 35events",
    text: `Klik op deze link om in te loggen bij 35events:\n\n${url}\n\nDeze link is 24 uur geldig.`,
    html: `
      <p>Klik op de knop hieronder om in te loggen bij 35events.</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#fff;text-decoration:none;border-radius:8px;">Inloggen</a></p>
      <p>Of kopieer deze link: ${url}</p>
      <p>Deze link is 24 uur geldig.</p>
    `,
  };
}

function formatDeadline(deadline: Date | null): string {
  if (!deadline) return "";
  return new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", year: "numeric" }).format(deadline);
}

export function extraInfoRequestEmail(eventName: string, url: string, deadline: Date | null) {
  const deadlineText = deadline ? ` Gelieve dit in te vullen vóór ${formatDeadline(deadline)}.` : "";
  return {
    subject: `Bijkomende info nodig — ${eventName}`,
    text: `We hebben nog bijkomende informatie nodig voor je registratie voor "${eventName}".${deadlineText}\n\nVul aan via: ${url}`,
    html: `
      <p>We hebben nog bijkomende informatie nodig voor je registratie voor <strong>${eventName}</strong>.${deadlineText}</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#fff;text-decoration:none;border-radius:8px;">Vul aan</a></p>
    `,
  };
}

export function extraInfoReminderEmail(eventName: string, url: string, deadline: Date | null) {
  const deadlineText = deadline ? ` vóór ${formatDeadline(deadline)}` : "";
  return {
    subject: `Herinnering: bijkomende info nodig — ${eventName}`,
    text: `Herinnering: gelieve de bijkomende informatie voor "${eventName}" in te vullen${deadlineText}.\n\nVul aan via: ${url}`,
    html: `
      <p>Herinnering: gelieve de bijkomende informatie voor <strong>${eventName}</strong> in te vullen${deadlineText}.</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#fff;text-decoration:none;border-radius:8px;">Vul aan</a></p>
    `,
  };
}

function bankTransferInstructions(paymentReference: string, expectedAmount: number): { text: string; html: string } {
  if (expectedAmount <= 0) {
    return { text: "Deze deelname is gratis.", html: "<p>Deze deelname is gratis.</p>" };
  }

  const priceLine = `${expectedAmount.toFixed(2).replace(".", ",")} euro`;
  const iban = process.env.BANK_ACCOUNT_IBAN;
  const accountName = process.env.BANK_ACCOUNT_NAME;

  if (!iban) {
    return {
      text: `Gelieve ${priceLine} over te schrijven met vermelding van code ${paymentReference}.`,
      html: `<p>Gelieve <strong>${priceLine}</strong> over te schrijven met vermelding van code <strong>${paymentReference}</strong>.</p>`,
    };
  }

  const toLine = accountName ? `${iban} (${accountName})` : iban;
  return {
    text: `Gelieve ${priceLine} over te schrijven naar ${toLine} met vermelding van code ${paymentReference}.`,
    html: `<p>Gelieve <strong>${priceLine}</strong> over te schrijven naar <strong>${toLine}</strong> met vermelding van code <strong>${paymentReference}</strong>.</p>`,
  };
}

export function contactNotificationEmail(name: string, email: string, message: string) {
  const escapedMessage = message.replace(/\n/g, "<br>");
  return {
    subject: `Nieuwe contactaanvraag van ${name}`,
    text: `Nieuwe contactaanvraag via de website.\n\nNaam: ${name}\nE-mail: ${email}\n\nBericht:\n${message}`,
    html: `
      <p>Nieuwe contactaanvraag via de website.</p>
      <p><strong>Naam:</strong> ${name}<br><strong>E-mail:</strong> ${email}</p>
      <p><strong>Bericht:</strong><br>${escapedMessage}</p>
    `,
  };
}

export function contactConfirmationEmail(name: string) {
  return {
    subject: "Je contactaanvraag is ontvangen",
    text: `Hey ${name},\n\nJe contactaanvraag is gelukt! We hebben je bericht ontvangen en nemen zo snel mogelijk contact met je op.\n\nTot snel,\n35events`,
    html: `
      <p>Hey ${name},</p>
      <p>Je contactaanvraag is gelukt! We hebben je bericht ontvangen en nemen zo snel mogelijk contact met je op.</p>
      <p>Tot snel,<br>35events</p>
    `,
  };
}

export function registrationConfirmationEmail(
  eventName: string,
  accountUrl: string,
  paymentReference: string,
  expectedAmount: number,
) {
  const instructions = bankTransferInstructions(paymentReference, expectedAmount);
  return {
    subject: `Registratie ontvangen — ${eventName}`,
    text: `Je registratie voor "${eventName}" is ontvangen.\n\n${instructions.text}\n\nBekijk je registratie: ${accountUrl}`,
    html: `
      <p>Je registratie voor <strong>${eventName}</strong> is ontvangen.</p>
      ${instructions.html}
      <p><a href="${accountUrl}">Bekijk je registratie</a></p>
    `,
  };
}
