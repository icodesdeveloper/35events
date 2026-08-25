import { prisma } from "@/lib/prisma";
import { resolveAudience, parseAudienceFilter } from "@/lib/campaigns";
import { sendResolvedCampaign } from "@/app/admin/(dashboard)/communications/actions";

// Called every 5 minutes by the scheduler set up in instrumentation.ts —
// fires any campaign whose scheduledAt has passed and marks it SENT. Safe to
// call as often as needed: a campaign only matches this query while it's
// still SCHEDULED, so a repeat tick before the DB write lands can't double-send.
export async function runScheduledCampaignsCheck(): Promise<void> {
  const due = await prisma.campaign.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
  });

  for (const campaign of due) {
    const recipients = await resolveAudience(parseAudienceFilter(campaign));
    await sendResolvedCampaign(campaign.id, campaign.subject, campaign.bodyHtml, recipients);
  }
}
