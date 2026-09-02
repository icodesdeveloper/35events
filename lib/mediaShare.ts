import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Why a cookie and not a ?share= query param: the gallery page is only half
// the story — every thumbnail, preview and video is a separate request to
// /api/media, which runs its own authorization. Threading the token onto
// every one of those URLs would smear it across the page (and the browser
// cache); a cookie set once when the link is opened reaches them all.
const COOKIE_NAME = "media-share";
const MAX_TOKENS = 10; // someone can hold links to several events at once
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

function parseTokens(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export async function readShareTokens(): Promise<string[]> {
  return parseTokens((await cookies()).get(COOKIE_NAME)?.value);
}

// Adds a token to the visitor's cookie, keeping any they already hold so
// opening a second event's link doesn't lose the first.
export async function rememberShareToken(token: string): Promise<void> {
  const existing = await readShareTokens();
  const tokens = [token, ...existing.filter((t) => t !== token)].slice(0, MAX_TOKENS);

  (await cookies()).set(COOKIE_NAME, JSON.stringify(tokens), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}

// The events the visitor may see at participant level thanks to share links.
// Revoked links resolve to nothing, so pulling a link kills access on the
// next request even for someone who already has the cookie.
export async function getSharedEventIds(): Promise<Set<string>> {
  const tokens = await readShareTokens();
  if (tokens.length === 0) return new Set();

  const links = await prisma.eventMediaShareLink.findMany({
    where: { token: { in: tokens }, revokedAt: null },
    select: { eventId: true },
  });
  return new Set(links.map((link) => link.eventId));
}
