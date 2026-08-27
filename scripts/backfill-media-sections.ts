import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// One-off: give every event a default "Algemeen" section holding its
// existing media, and set Event.mediaVisibility so events that currently
// show under /media (published + already past) keep showing there — the
// admin takes it over from here. See prisma/migrations history and
// ../.claude/plans/fizzy-munching-panda.md Fase 0.
async function main() {
  const now = new Date();
  const events = await prisma.event.findMany({ include: { media: true } });

  for (const event of events) {
    if (event.media.length > 0) {
      const section = await prisma.eventMediaSection.create({
        data: { eventId: event.id, title: "Algemeen", order: 0 },
      });
      await prisma.eventMedia.updateMany({
        where: { eventId: event.id },
        data: { sectionId: section.id },
      });
    }

    const isPast = event.endDate ? event.endDate < now : event.date < now;
    const visibleUnderOldRule = event.published && isPast;
    await prisma.event.update({
      where: { id: event.id },
      data: { mediaVisibility: visibleUnderOldRule ? "PUBLIC" : "HIDDEN" },
    });
  }

  console.log(`Backfilled ${events.length} event(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
