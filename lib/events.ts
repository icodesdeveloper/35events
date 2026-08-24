import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// "Past" vs "upcoming" is derived from endDate ?? date — no separate status
// field to keep in sync.
function pastEventWhere(): Prisma.EventWhereInput {
  const now = new Date();
  return {
    published: true,
    OR: [{ endDate: { lt: now } }, { endDate: null, date: { lt: now } }],
  };
}

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
  });
}

export function getPastEvents() {
  return prisma.event.findMany({
    where: pastEventWhere(),
    orderBy: { date: "desc" },
  });
}

export function getEventBySlug(slug: string) {
  return prisma.event.findFirst({
    where: { slug, published: true },
    include: { media: { orderBy: { order: "asc" } } },
  });
}

export async function getRegisteredEventIds(participantId: string): Promise<Set<string>> {
  const registrations = await prisma.registration.findMany({
    where: { participantId },
    select: { eventId: true },
  });
  return new Set(registrations.map((r) => r.eventId));
}
