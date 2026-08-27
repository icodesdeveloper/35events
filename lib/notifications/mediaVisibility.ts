import { prisma } from "@/lib/prisma";

// Same edge-triggered, watermark-anchored approach as
// lib/notifications/registrationWindow.ts (see that file for the full
// rationale) — only flips Event/EventMediaSection visibility from HIDDEN to
// its scheduled target when the scheduled date fell since the last actual
// run, never "whenever we're past it", so a manual visibility change
// afterward is never fought on the next tick.
//
// Unlike the registration window (a fixed boolean flip), the target level
// here varies per row (PUBLIC or PARTICIPANTS_ONLY), so matching rows are
// updated individually rather than via one blanket updateMany.
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
let lastCheckedAt: Date | null = null;

export async function runMediaVisibilityCheck(now: Date = new Date()): Promise<void> {
  const windowStart = lastCheckedAt ?? new Date(now.getTime() - CHECK_INTERVAL_MS);

  const dueEvents = await prisma.event.findMany({
    where: {
      mediaVisibility: "HIDDEN",
      mediaVisibleFromDate: { gt: windowStart, lte: now },
      mediaVisibleFromTarget: { not: null },
    },
    select: { id: true, mediaVisibleFromTarget: true },
  });
  for (const event of dueEvents) {
    await prisma.event.update({
      where: { id: event.id },
      data: { mediaVisibility: event.mediaVisibleFromTarget! },
    });
  }

  const dueSections = await prisma.eventMediaSection.findMany({
    where: {
      inheritVisibility: false,
      visibility: "HIDDEN",
      visibleFromDate: { gt: windowStart, lte: now },
      visibleFromTarget: { not: null },
    },
    select: { id: true, visibleFromTarget: true },
  });
  for (const section of dueSections) {
    await prisma.eventMediaSection.update({
      where: { id: section.id },
      data: { visibility: section.visibleFromTarget! },
    });
  }

  lastCheckedAt = now;
}
