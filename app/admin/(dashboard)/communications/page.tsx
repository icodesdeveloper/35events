import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPen, faTrash, faEye } from "@fortawesome/free-solid-svg-icons";
import { prisma } from "@/lib/prisma";
import { deleteCampaign } from "@/app/admin/(dashboard)/communications/actions";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import Tooltip from "@/components/admin/Tooltip";
import MailOutboxPanel from "@/components/admin/MailOutboxPanel";

const STATUS_LABEL: Record<string, string> = { DRAFT: "Concept", SCHEDULED: "Gepland", SENT: "Verzonden" };
const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400",
  SCHEDULED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  SENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

const dateTimeFormatter = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function CommunicationsPage() {
  const [campaigns, outbox] = await Promise.all([
    prisma.campaign.findMany({ orderBy: { updatedAt: "desc" } }),
    // Everything still stuck, wherever in the app it came from — not just
    // campaigns, so this page is the one place to check on mail delivery.
    prisma.outboundMail.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 50 }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Communicatie</h1>
        <Link
          href="/admin/communications/new"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
        >
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
          Nieuw bericht
        </Link>
      </div>

      <MailOutboxPanel mails={outbox} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase dark:border-zinc-800 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">Onderwerp</th>
              <th className="px-5 py-3 font-medium">Doelgroep</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Bijgewerkt</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">
                  {campaign.subject || <span className="text-slate-400 italic dark:text-slate-500">(geen onderwerp)</span>}
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  {campaign.audienceMode === "ALL_PARTICIPANTS" ? "Alle gebruikers" : "Op basis van events"}
                </td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[campaign.status]}`}>
                    {STATUS_LABEL[campaign.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  {dateTimeFormatter.format(campaign.updatedAt)}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Tooltip label={campaign.status === "SENT" ? "Bekijken" : "Bewerken"}>
                      <Link
                        href={`/admin/communications/${campaign.id}`}
                        className="text-slate-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
                        aria-label={campaign.status === "SENT" ? "Bekijken" : "Bewerken"}
                      >
                        <FontAwesomeIcon icon={campaign.status === "SENT" ? faEye : faPen} className="h-3.5 w-3.5" />
                      </Link>
                    </Tooltip>
                    {campaign.status !== "SENT" ? (
                      <Tooltip label="Verwijderen">
                        <form action={deleteCampaign.bind(null, campaign.id)}>
                          <ConfirmSubmitButton
                            confirmMessage={`"${campaign.subject || "Dit concept"}" verwijderen?`}
                            className="text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                            ariaLabel="Verwijderen"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                          </ConfirmSubmitButton>
                        </form>
                      </Tooltip>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nog geen communicatie verstuurd.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
