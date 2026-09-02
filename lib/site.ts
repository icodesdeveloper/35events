// Canonical base URL for links in emails, the sitemap, robots.txt, and the
// media share links. Must be set to the real domain in production — falls
// back to localhost for local dev only.
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

// Left unset in production this fails quietly and confusingly: share links
// and mail links come out pointing at localhost, which only the person who
// clicks them finds out. A redirect can't be built from a relative request
// origin either — the app binds to 0.0.0.0, so that yields http://0.0.0.0.
// One warning at boot beats debugging a dead WhatsApp link later.
if (process.env.NODE_ENV === "production" && !process.env.SITE_URL) {
  console.warn(
    "[site] SITE_URL is not set — e-mails, deel-links en de sitemap zullen naar http://localhost:3000 wijzen. " +
      "Zet SITE_URL op het publieke domein (bv. https://35events.com).",
  );
}
