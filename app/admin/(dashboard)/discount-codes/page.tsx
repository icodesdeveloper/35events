import { prisma } from "@/lib/prisma";
import DiscountCodesWorkspace from "@/components/admin/DiscountCodesWorkspace";

export default async function DiscountCodesPage() {
  const [discountCodes, events, participants] = await Promise.all([
    prisma.discountCode.findMany({
      include: { event: { select: { id: true, name: true } }, participant: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.event.findMany({ select: { id: true, name: true }, orderBy: { date: "desc" } }),
    prisma.participant.findMany({ select: { id: true, username: true, email: true }, orderBy: { username: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-white">Kortingscodes</h1>
      <DiscountCodesWorkspace
        discountCodes={discountCodes.map((d) => ({
          id: d.id,
          code: d.code,
          type: d.type as "PERCENT" | "FIXED",
          value: d.value.toString(),
          eventId: d.eventId,
          eventName: d.event?.name ?? null,
          participantId: d.participantId,
          participantName: d.participant?.username ?? null,
          validFrom: d.validFrom ? d.validFrom.toISOString().slice(0, 10) : null,
          validUntil: d.validUntil ? d.validUntil.toISOString().slice(0, 10) : null,
          maxUses: d.maxUses,
          useCount: d.useCount,
        }))}
        events={events}
        participants={participants}
      />
    </div>
  );
}
