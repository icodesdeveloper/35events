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
