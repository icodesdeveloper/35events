import { prisma } from "@/lib/prisma";
import CommunicationComposer from "@/components/admin/CommunicationComposer";

export default async function NewCommunicationPage() {
  const [events, participants] = await Promise.all([
    prisma.event.findMany({ select: { id: true, name: true, date: true }, orderBy: { date: "desc" } }),
    prisma.participant.findMany({ select: { id: true, username: true, email: true }, orderBy: { username: "asc" } }),
  ]);

  return <CommunicationComposer campaign={null} events={events} participants={participants} />;
}
