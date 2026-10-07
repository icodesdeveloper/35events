import { prisma } from "@/lib/prisma";
import { getExpectedAmount, type PaymentStatus } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { formatEventDate, formatPrice } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

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

// Event-scoped variables ({{betaalcode}}, {{bedrag}}, ...) need one
// registration per recipient, which only exists when the audience is a
// single event.
export function getSingleEventId(filter: AudienceFilter): string | null {
  return filter.mode === "EVENTS" && filter.eventIds.length === 1 ? filter.eventIds[0] : null;
}

export type RecipientVariables = { values: Record<string, string>; registrationId: string | null };

// Per-recipient values for the placeholders in lib/campaignVariables.ts,
// keyed by participant id.
export async function resolveRecipientVariables(
  filter: AudienceFilter,
  recipients: CampaignRecipient[],
): Promise<Map<string, RecipientVariables>> {
  const settings = await getSettings();
  const eventId = getSingleEventId(filter);
  const registrations = eventId
    ? await prisma.registration.findMany({
        where: { eventId, participantId: { in: recipients.map((recipient) => recipient.id) } },
        include: { event: { select: { name: true, date: true, endDate: true } }, payments: true },
      })
    : [];
  const registrationByParticipant = new Map(registrations.map((registration) => [registration.participantId, registration]));

  const result = new Map<string, RecipientVariables>();
  for (const recipient of recipients) {
    const values: Record<string, string> = {
      gebruikersnaam: recipient.username,
      email: recipient.email,
      account_link: `${SITE_URL}/account`,
      rekeningnummer: settings.bankAccountIban ?? "",
      begunstigde: settings.bankAccountName ?? "",
    };

    const registration = registrationByParticipant.get(recipient.id);
    if (registration) {
      const expected = getExpectedAmount(registration);
      const received = registration.payments.reduce((sum, payment) => sum + Number(payment.amount.toString()), 0);
      values.event = registration.event.name;
      values.event_datum = formatEventDate(registration.event.date, registration.event.endDate);
      values.betaalcode = registration.paymentReference ?? "";
      values.bedrag = formatPrice(expected);
      values.openstaand_bedrag = formatPrice(Math.max(0, expected - received));
    }

    result.set(recipient.id, { values, registrationId: registration?.id ?? null });
  }
  return result;
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
