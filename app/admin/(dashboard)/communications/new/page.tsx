import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { CAMPAIGN_PRESETS } from "@/lib/mail/campaignTemplates";
import CommunicationComposer from "@/components/admin/CommunicationComposer";

export default async function NewCommunicationPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; eventId?: string }>;
}) {
  const { preset, eventId } = await searchParams;
  const [events, participants, settings] = await Promise.all([
    prisma.event.findMany({ select: { id: true, name: true, date: true }, orderBy: { date: "desc" } }),
    prisma.participant.findMany({ select: { id: true, username: true, email: true }, orderBy: { username: "asc" } }),
    getSettings(),
  ]);

  // ?preset=...&eventId=... opens the composer with that preset applied —
  // used by the "Betalingsinfo mailen" link on an event's registrations page.
  const prefill =
    preset && eventId && CAMPAIGN_PRESETS.some((p) => p.id === preset) && events.some((e) => e.id === eventId)
      ? { presetId: preset, eventId }
      : null;

  return (
    <CommunicationComposer
      campaign={null}
      events={events}
      participants={participants}
      bankAccount={{ iban: settings.bankAccountIban, accountName: settings.bankAccountName }}
      prefill={prefill}
    />
  );
}
