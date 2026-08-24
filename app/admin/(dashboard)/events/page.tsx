import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPen, faTrash, faImages, faUsers, faListCheck, faChartSimple } from "@fortawesome/free-solid-svg-icons";
import { prisma } from "@/lib/prisma";
import { formatEventDate } from "@/lib/format";
import { deleteEvent, togglePublished, toggleRegistration } from "@/app/admin/(dashboard)/events/actions";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({ orderBy: { date: "desc" } });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Events</h1>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
        >
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
          Nieuw event
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase dark:border-zinc-800 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">Naam</th>
              <th className="px-5 py-3 font-medium">Datum</th>
              <th className="px-5 py-3 font-medium">Gepubliceerd</th>
              <th className="px-5 py-3 font-medium">Registratie</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{event.name}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  {formatEventDate(event.date, event.endDate)}
                </td>
                <td className="px-5 py-3">
                  <form action={togglePublished.bind(null, event.id, !event.published)}>
                    <button
                      type="submit"
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        event.published
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400"
                      }`}
                    >
                      {event.published ? "Gepubliceerd" : "Concept"}
                    </button>
                  </form>
                </td>
                <td className="px-5 py-3">
                  <form action={toggleRegistration.bind(null, event.id, !event.registrationOpen)}>
                    <button
                      type="submit"
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        event.registrationOpen
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400"
                      }`}
                    >
                      {event.registrationOpen ? "Open" : "Gesloten"}
                    </button>
                  </form>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/events/${event.id}/registrations`}
                      className="text-slate-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
                      aria-label="Registraties"
                    >
                      <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/admin/events/${event.id}/media`}
                      className="text-slate-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
                      aria-label="Media"
                    >
                      <FontAwesomeIcon icon={faImages} className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/admin/events/${event.id}/edit#vragen`}
                      className="text-slate-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
                      aria-label="Bijkomende vragen"
                    >
                      <FontAwesomeIcon icon={faListCheck} className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/admin/events/${event.id}/questions/answers`}
                      className="text-slate-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
                      aria-label="Antwoorden"
                    >
                      <FontAwesomeIcon icon={faChartSimple} className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/admin/events/${event.id}/edit`}
                      className="text-slate-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
                      aria-label="Bewerken"
                    >
                      <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                    </Link>
                    <form action={deleteEvent.bind(null, event.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`"${event.name}" verwijderen? Dit kan niet ongedaan gemaakt worden.`}
                        className="text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                        ariaLabel="Verwijderen"
                      >
                        <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nog geen events. Maak je eerste event aan.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
