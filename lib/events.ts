import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// "Upcoming" is derived from endDate ?? date — no separate status field to
// keep in sync.
function upcomingEventWhere(): Prisma.EventWhereInput {
  const now = new Date();
  return {
    published: true,
    OR: [{ endDate: { gte: now } }, { endDate: null, date: { gte: now } }],
  };
}

export function getUpcomingEvents() {
  return prisma.event.findMany({
    where: upcomingEventWhere(),
    orderBy: { date: "asc" },
    include: { earlybirdPrices: true },
  });
}

export function getEventBySlug(slug: string) {
  return prisma.event.findFirst({
    where: { slug, published: true },
    include: {
      mediaSections: { orderBy: { order: "asc" }, include: { media: { orderBy: { order: "asc" } } } },
      earlybirdPrices: true,
    },
  });
}

export async function getRegisteredEventIds(participantId: string): Promise<Set<string>> {
  const registrations = await prisma.registration.findMany({
    where: { participantId },
    select: { eventId: true },
  });
  return new Set(registrations.map((r) => r.eventId));
}
