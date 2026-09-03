"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail/transporter";
import { campaignEmail } from "@/lib/mail/templates";
import { sanitizeContentHtml } from "@/lib/sanitizeHtml";
import { resolveAudience, type AudienceFilter, type CampaignRecipient } from "@/lib/campaigns";
import type { PaymentStatus } from "@/lib/payments";

export type CampaignFormState = { error?: string; notice?: string; fieldErrors?: Record<string, string> };

function readAudienceFilter(formData: FormData): AudienceFilter {
  const mode = formData.get("audienceMode");
  if (mode === "EVENTS") {
    return {
      mode: "EVENTS",
      eventIds: formData.getAll("eventIds").map(String),
      statuses: formData.getAll("statuses").map(String) as PaymentStatus[],
    };
  }
  if (mode === "SPECIFIC_PARTICIPANTS") {
    return { mode: "SPECIFIC_PARTICIPANTS", participantIds: formData.getAll("participantIds").map(String) };
  }
  return { mode: "ALL_PARTICIPANTS" };
}

// Single save path for the composer — which of the three buttons ("Concept
// opslaan" / "Gepland verzenden" / "Verzenden") was clicked is carried via
// the "intent" field of the submitting <button>, same pattern as
// saveEventEdit (app/admin/(dashboard)/events/[id]/edit/actions.ts).
export async function saveCampaign(
  campaignId: string | null,
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  if (campaignId) {
    const existing = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
    if (existing?.status === "SENT") {
      return { error: "Deze communicatie is al verzonden en kan niet meer gewijzigd worden." };
    }
  }

  const intent = formData.get("intent") === "schedule" ? "schedule" : formData.get("intent") === "send" ? "send" : "draft";
  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = sanitizeContentHtml(String(formData.get("bodyHtml") ?? ""));
  const filter = readAudienceFilter(formData);

  if (intent !== "draft" && (!subject || !bodyHtml)) {
    return { error: "Onderwerp en tekst zijn verplicht." };
  }

  let scheduledAt: Date | null = null;
  if (intent === "schedule") {
    const dateRaw = String(formData.get("scheduledDate") ?? "");
    const timeRaw = String(formData.get("scheduledTime") ?? "");
    if (!dateRaw || !timeRaw) return { fieldErrors: { scheduledDate: "Kies een datum en tijdstip." } };
    scheduledAt = new Date(`${dateRaw}T${timeRaw}`);
    if (Number.isNaN(scheduledAt.getTime())) return { fieldErrors: { scheduledDate: "Ongeldige datum/tijd." } };
  }

  let recipients: CampaignRecipient[] = [];
  if (intent !== "draft") {
    recipients = await resolveAudience(filter);
    if (recipients.length === 0) return { error: "Geen ontvangers gevonden voor deze doelgroep." };
  }

  const data = {
    subject,
    bodyHtml,
    status: intent === "schedule" ? "SCHEDULED" : "DRAFT",
    audienceMode: filter.mode,
    eventIds: filter.mode === "EVENTS" ? filter.eventIds : Prisma.JsonNull,
    statuses: filter.mode === "EVENTS" ? filter.statuses : Prisma.JsonNull,
    participantIds: filter.mode === "SPECIFIC_PARTICIPANTS" ? filter.participantIds : Prisma.JsonNull,
    scheduledAt,
  };

  const campaign = campaignId
    ? await prisma.campaign.update({ where: { id: campaignId }, data })
    : await prisma.campaign.create({ data });

  let queued = 0;
  if (intent === "send") {
    ({ queued } = await sendResolvedCampaign(campaign.id, subject, bodyHtml, recipients));
  }

  revalidatePath("/admin/communications");
  revalidatePath(`/admin/communications/${campaign.id}`);
  if (!campaignId) redirect(`/admin/communications/${campaign.id}`);
  return queued > 0
    ? {
        notice: `${queued} van de ${recipients.length} mails kon de mailserver niet aannemen. Ze staan in de outbox en worden elk uur opnieuw geprobeerd tot het lukt.`,
      }
    : {};
}

// Shared by saveCampaign's "send" intent and the scheduled-send background
// check (lib/notifications/campaigns.ts) — fires the mails and marks the row
// SENT.
export async function sendResolvedCampaign(
  campaignId: string,
  subject: string,
  bodyHtml: string,
  recipients: CampaignRecipient[],
): Promise<{ queued: number }> {
  const { subject: mailSubject, text, html } = await campaignEmail(subject, bodyHtml);
  const results = await Promise.all(
    recipients.map((recipient) =>
      sendMail({ to: recipient.email, subject: mailSubject, text, html, source: "communicatie" }).catch(() => ({
        delivered: false,
        queued: false,
      })),
    ),
  );
  // Anything SMTP refused is now in the outbox rather than lost, so the
  // campaign still counts as sent — the count is what the admin needs to be
  // told about.
  const queued = results.filter((result) => result.queued).length;

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SENT", sentAt: new Date(), sentCount: recipients.length },
  });

  return { queued };
}

export async function unscheduleCampaign(campaignId: string) {
  const existing = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
  if (existing?.status !== "SCHEDULED") return;

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "DRAFT", scheduledAt: null } });
  revalidatePath("/admin/communications");
  revalidatePath(`/admin/communications/${campaignId}`);
}

export async function deleteCampaign(campaignId: string) {
  const existing = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
  if (existing?.status === "SENT") return;

  await prisma.campaign.delete({ where: { id: campaignId } });
  revalidatePath("/admin/communications");
}

export async function previewAudience(
  mode: string,
  eventIds: string[],
  statuses: string[],
  participantIds: string[],
): Promise<CampaignRecipient[]> {
  let filter: AudienceFilter = { mode: "ALL_PARTICIPANTS" };
  if (mode === "EVENTS") filter = { mode: "EVENTS", eventIds, statuses: statuses as PaymentStatus[] };
  if (mode === "SPECIFIC_PARTICIPANTS") filter = { mode: "SPECIFIC_PARTICIPANTS", participantIds };
  return resolveAudience(filter);
}

// Outbox: mail that SMTP refused, from anywhere in the app. Retried hourly by
// lib/notifications/outbox.ts; these let the admin push or drop one by hand.
export async function retryOutboxNow() {
  const { runOutboxCheck } = await import("@/lib/notifications/outbox");
  await runOutboxCheck();
  revalidatePath("/admin/communications");
}

export async function deleteOutboxMail(mailId: string) {
  await prisma.outboundMail.delete({ where: { id: mailId } }).catch(() => {});
  revalidatePath("/admin/communications");
}
