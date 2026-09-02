import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rememberShareToken } from "@/lib/mediaShare";

// Entry point for a shared media link. A Route Handler rather than a page
// because it has to set a cookie, which a server component render cannot do.
// It stores the token and bounces to the event's normal media page, so the
// URL people end up on (and might screenshot back into the group chat) no
// longer carries the token.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const link = await prisma.eventMediaShareLink.findUnique({
    where: { token },
    include: { event: { select: { slug: true, published: true } } },
  });

  // One generic destination for "no such token", "revoked" and "event not
  // published" — a visitor probing tokens learns nothing about which it was.
  if (!link || link.revokedAt !== null || !link.event.published) {
    return NextResponse.redirect(new URL("/media?share=invalid", request.url));
  }

  await rememberShareToken(token);
  await prisma.eventMediaShareLink.update({ where: { id: link.id }, data: { lastUsedAt: new Date() } });

  return NextResponse.redirect(new URL(`/events/${link.event.slug}/media`, request.url));
}
