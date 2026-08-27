// Shared dark-themed HTML shell for every outgoing mail — mirrors the
// public site's "precisie grand touring" look (black background, champagne
// accent, sharp-edged buttons). Built as nested tables with bgcolor
// attributes (not just CSS) and inline styles throughout, since that's the
// only layout approach Outlook's Word rendering engine and most webmail
// clients render consistently — a <div>-based layout with a <style> block
// gets silently stripped in enough clients to not be worth the risk.

import { getSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";

const COLORS = {
  pageBg: "#09090b",
  cardBg: "#111113",
  border: "#27272a",
  accent: "#c9a574",
  accentDim: "#8a7350",
  text: "#f4f4f5",
  muted: "#a1a1aa",
};

const FONT_STACK = "'Space Grotesk', Helvetica, Arial, sans-serif";
const MONO_STACK = "'JetBrains Mono', 'Courier New', monospace";

export function emailButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;background-color:${COLORS.accent};color:#0a0a0a;text-decoration:none;font-family:${FONT_STACK};font-weight:600;font-size:14px;">${label}</a>`;
}

export function emailMono(text: string): string {
  return `<span style="font-family:${MONO_STACK};letter-spacing:0.03em;">${text}</span>`;
}

// Plain <a href="..."> tags from admin-authored rich-text content (event
// descriptions never reach here, but campaign bodies do) have no styling —
// sanitize-html strips any `style` attribute a user could add, so this only
// ever touches those, never the already-styled anchors from emailButton().
function styleContentLinks(html: string): string {
  return html.replace(/<a\s+([^>]*)>/gi, (match, attrs: string) => {
    if (/style\s*=/i.test(attrs)) return match;
    return `<a style="color:${COLORS.accent};text-decoration:underline;" ${attrs}>`;
  });
}

export async function renderEmailLayout({
  preheader,
  bodyHtml,
}: {
  preheader?: string;
  bodyHtml: string;
}): Promise<{ html: string }> {
  const year = new Date().getFullYear();
  const styledBodyHtml = styleContentLinks(bodyHtml);

  const settings = await getSettings();
  const logoMarkup = settings.logoPath
    ? `<tr><td><img src="${SITE_URL}/api/media/${settings.logoPath}" alt="35events" height="32" style="height:32px;width:auto;display:block;" /></td></tr>`
    : `<tr>
        <td style="border:1px solid ${COLORS.accent};width:32px;height:32px;text-align:center;vertical-align:middle;font-family:${FONT_STACK};font-weight:700;font-size:14px;color:${COLORS.accent};">
          35
        </td>
        <td style="padding-left:10px;font-family:${FONT_STACK};font-weight:600;font-size:16px;color:${COLORS.text};">
          35events
        </td>
      </tr>`;

  const html = `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>35events</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLORS.pageBg};">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.pageBg}" style="background-color:${COLORS.pageBg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="padding-bottom:24px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  ${logoMarkup}
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="${COLORS.cardBg}" style="background-color:${COLORS.cardBg};border:1px solid ${COLORS.border};padding:32px;font-family:${FONT_STACK};color:${COLORS.text};font-size:15px;line-height:1.6;">
                ${styledBodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding-top:20px;font-family:${FONT_STACK};font-size:12px;color:${COLORS.muted};">
                &copy; ${year} 35events
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html };
}
