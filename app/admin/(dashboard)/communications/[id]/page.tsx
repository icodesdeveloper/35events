import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CommunicationComposer, { type CampaignData } from "@/components/admin/CommunicationComposer";

export default async function EditCommunicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, events, participants] = await Promise.all([
    prisma.campaign.findUnique({ where: { id } }),
    prisma.event.findMany({ select: { id: true, name: true, date: true }, orderBy: { date: "desc" } }),
    prisma.participant.findMany({ select: { id: true, username: true, email: true }, orderBy: { username: "asc" } }),
  ]);
  if (!campaign) notFound();

  const data: CampaignData = {
    id: campaign.id,
    subject: campaign.subject,
    bodyHtml: campaign.bodyHtml,
    status: campaign.status as CampaignData["status"],
    audienceMode: campaign.audienceMode as CampaignData["audienceMode"],
    eventIds: Array.isArray(campaign.eventIds) ? (campaign.eventIds as string[]) : [],
    statuses: Array.isArray(campaign.statuses) ? (campaign.statuses as string[]) : [],
    participantIds: Array.isArray(campaign.participantIds) ? (campaign.participantIds as string[]) : [],
    scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.toISOString() : null,
    sentAt: campaign.sentAt ? campaign.sentAt.toISOString() : null,
    sentCount: campaign.sentCount,
  };

  return <CommunicationComposer campaign={data} events={events} participants={participants} />;
}
