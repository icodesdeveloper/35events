import type { PaymentStatus } from "@/lib/payments";

export type CampaignTemplate = { id: string; name: string; subject: string; bodyHtml: string };

// Picked from the "Kies een template"-button in the communication composer
// (components/admin/CommunicationComposer.tsx) — fills the subject + editor
// so the admin has a site-styled starting point instead of a blank page.
export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "standaard",
    name: "Standaard",
    subject: "Nieuws van 35events",
    bodyHtml:
      "<p>Hey,</p><p>We hebben nieuws om met je te delen.</p><p>Tot binnenkort,<br>35events</p>",
  },
];

// A preset goes further than a template: besides subject and text it also
// sets the audience, so a recurring mail is ready to send after picking the
// event. Everything it fills in stays editable in the composer. The body
// uses the placeholders from lib/campaignVariables.ts.
export type CampaignPreset = {
  id: string;
  name: string;
  description: string;
  statuses: PaymentStatus[];
  subject: string;
  buildBodyHtml: (bankAccount: { accountName: string | null }) => string;
};

export const CAMPAIGN_PRESETS: CampaignPreset[] = [
  {
    id: "betalingsinfo",
    name: "Betalingsinfo naar niet-betaalde deelnemers",
    description: "Bedrag, rekeningnummer en persoonlijke betaalcode voor iedereen die nog niet betaald heeft.",
    statuses: ["PENDING_PAYMENT"],
    subject: "Betalingsinfo — {{event}}",
    buildBodyHtml: ({ accountName }) =>
      "<p>Hey {{gebruikersnaam}},</p>" +
      "<p>Je bent ingeschreven voor <strong>{{event}}</strong> ({{event_datum}}), maar we hebben je betaling nog niet ontvangen. Je deelname is pas bevestigd zodra de betaling binnen is.</p>" +
      `<p>Gelieve <strong>{{openstaand_bedrag}}</strong> over te schrijven naar <strong>{{rekeningnummer}}</strong>${
        accountName ? " ({{begunstigde}})" : ""
      } met vermelding van code <strong>{{betaalcode}}</strong>.</p>` +
      "<p>Je registratie bekijken kan altijd via {{account_link}}.</p>" +
      "<p>Tot binnenkort,<br>35events</p>",
  },
];
