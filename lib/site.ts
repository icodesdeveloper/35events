// Canonical base URL for links in emails, the sitemap, and robots.txt.
// Must be set to the real domain in production — falls back to localhost
// for local dev only.
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
