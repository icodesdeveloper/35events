import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rememberShareToken } from "@/lib/mediaShare";
import { SITE_URL } from "@/lib/site";

// Entry point for a shared media link. A Route Handler rather than a page
// because it has to set a cookie, which a server component render cannot do.
// It stores the token and bounces to the event's normal media page, so the
// URL people end up on (and might screenshot back into the group chat) no
// longer carries the token.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const link = await prisma.eventMediaShareLink.findUnique({
    where: { token },
    include: { event: { select: { slug: true, published: true } } },
  });

  // Redirect against SITE_URL, not request.url: the app is started with
  // `-H 0.0.0.0`, so the request's own origin can be the bind address rather
  // than the public domain — which sent people to http://0.0.0.0:<port>.
  // These links get pasted into WhatsApp, so the destination has to be the
  // real domain regardless of how the request reached the container.
  //
  // One generic destination for "no such token", "revoked" and "event not
  // published" — a visitor probing tokens learns nothing about which it was.
  if (!link || link.revokedAt !== null || !link.event.published) {
    return NextResponse.redirect(new URL("/media?share=invalid", SITE_URL));
  }

  await rememberShareToken(token);
  await prisma.eventMediaShareLink.update({ where: { id: link.id }, data: { lastUsedAt: new Date() } });

  return NextResponse.redirect(new URL(`/events/${link.event.slug}/media`, SITE_URL));
}
