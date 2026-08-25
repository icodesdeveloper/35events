import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faLock, faLockOpen } from "@fortawesome/free-solid-svg-icons";
import { prisma } from "@/lib/prisma";
import { toggleParticipantDisabled, deleteParticipant } from "@/app/admin/(dashboard)/participants/actions";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import Tooltip from "@/components/admin/Tooltip";

const dateFormatter = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short", year: "numeric" });

export default async function ParticipantsPage() {
  const participants = await prisma.participant.findMany({
    include: { _count: { select: { registrations: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-white">Gebruikers</h1>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase dark:border-zinc-800 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">Gebruikersnaam</th>
              <th className="px-5 py-3 font-medium">E-mail</th>
              <th className="px-5 py-3 font-medium">Geverifieerd</th>
              <th className="px-5 py-3 font-medium">Registraties</th>
              <th className="px-5 py-3 font-medium">Aangemaakt op</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {participants.map((participant) => {
              const disabled = Boolean(participant.disabledAt);
              return (
                <tr key={participant.id}>
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{participant.username}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{participant.email}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                    {participant.emailVerifiedAt ? "Ja" : "Nee"}
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                    {participant._count.registrations}
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                    {dateFormatter.format(participant.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        disabled
                          ? "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {disabled ? "Gedeactiveerd" : "Actief"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Tooltip label={disabled ? "Account weer activeren" : "Account deactiveren (kan niet meer inloggen)"}>
                        <form action={toggleParticipantDisabled.bind(null, participant.id, !disabled)}>
                          <button
                            type="submit"
                            className="text-slate-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
                            aria-label={disabled ? "Activeren" : "Deactiveren"}
                          >
                            <FontAwesomeIcon icon={disabled ? faLockOpen : faLock} className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </Tooltip>
                      <Tooltip label="Account permanent verwijderen">
                        <form action={deleteParticipant.bind(null, participant.id)}>
                          <ConfirmSubmitButton
                            confirmMessage={`Account "${participant.username}" permanent verwijderen? Dit verwijdert ook al hun registraties, betalingen en antwoorden. Dit kan niet ongedaan gemaakt worden.`}
                            className="text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                            ariaLabel="Verwijderen"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                          </ConfirmSubmitButton>
                        </form>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })}
            {participants.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nog geen gebruikers.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
