import { prisma } from "@/lib/prisma";
import CommunicationComposer from "@/components/admin/CommunicationComposer";

export default async function NewCommunicationPage() {
  const events = await prisma.event.findMany({ select: { id: true, name: true, date: true }, orderBy: { date: "desc" } });

  return <CommunicationComposer campaign={null} events={events} />;
}
