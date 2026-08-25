import { prisma } from "@/lib/prisma";
import type { PaymentStatus } from "@/lib/payments";

export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENT";
export type AudienceMode = "ALL_PARTICIPANTS" | "EVENTS" | "SPECIFIC_PARTICIPANTS";

export type AudienceFilter =
  | { mode: "ALL_PARTICIPANTS" }
  | { mode: "EVENTS"; eventIds: string[]; statuses: PaymentStatus[] }
  | { mode: "SPECIFIC_PARTICIPANTS"; participantIds: string[] };

export type CampaignRecipient = { id: string; username: string; email: string };

// The single place that knows how to turn a campaign's audience filter into
// an actual recipient list — used both for the live preview in the composer
// and for the real send, so they can never drift apart.
export async function resolveAudience(filter: AudienceFilter): Promise<CampaignRecipient[]> {
  if (filter.mode === "ALL_PARTICIPANTS") {
    return prisma.participant.findMany({
      where: { disabledAt: null },
      select: { id: true, username: true, email: true },
      orderBy: { username: "asc" },
    });
  }

  if (filter.mode === "SPECIFIC_PARTICIPANTS") {
    if (filter.participantIds.length === 0) return [];
    return prisma.participant.findMany({
      where: { id: { in: filter.participantIds }, disabledAt: null },
      select: { id: true, username: true, email: true },
      orderBy: { username: "asc" },
    });
  }

  if (filter.eventIds.length === 0 || filter.statuses.length === 0) return [];

  const registrations = await prisma.registration.findMany({
    where: {
      eventId: { in: filter.eventIds },
      paymentStatus: { in: filter.statuses },
      participant: { disabledAt: null },
    },
    select: { participant: { select: { id: true, username: true, email: true } } },
  });

  const byId = new Map<string, CampaignRecipient>();
  for (const { participant } of registrations) byId.set(participant.id, participant);
  return Array.from(byId.values()).sort((a, b) => a.username.localeCompare(b.username, "nl"));
}

export function parseAudienceFilter(campaign: {
  audienceMode: string;
  eventIds: unknown;
  statuses: unknown;
  participantIds: unknown;
}): AudienceFilter {
  if (campaign.audienceMode === "EVENTS") {
    return {
      mode: "EVENTS",
      eventIds: Array.isArray(campaign.eventIds) ? (campaign.eventIds as string[]) : [],
      statuses: Array.isArray(campaign.statuses) ? (campaign.statuses as PaymentStatus[]) : [],
    };
  }
  if (campaign.audienceMode === "SPECIFIC_PARTICIPANTS") {
    return {
      mode: "SPECIFIC_PARTICIPANTS",
      participantIds: Array.isArray(campaign.participantIds) ? (campaign.participantIds as string[]) : [],
    };
  }
  return { mode: "ALL_PARTICIPANTS" };
}
