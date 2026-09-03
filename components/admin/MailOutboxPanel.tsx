import type { OutboundMail } from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation, faRotate, faTrash } from "@fortawesome/free-solid-svg-icons";
import { retryOutboxNow, deleteOutboxMail } from "@/app/admin/(dashboard)/communications/actions";

// Only rendered when something is stuck — an empty outbox is the normal case
// and does not need a permanent "0 mails" box taking up the page.
export default function MailOutboxPanel({ mails }: { mails: OutboundMail[] }) {
  if (mails.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {mails.length === 1 ? "1 mail wacht in de outbox" : `${mails.length} mails wachten in de outbox`}
            </h2>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              De mailserver kon deze niet aannemen. Ze worden automatisch elk uur opnieuw geprobeerd tot het lukt,
              ook na een herstart van de server.
            </p>
          </div>
        </div>
        <form action={retryOutboxNow}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
          >
            <FontAwesomeIcon icon={faRotate} className="h-3 w-3" />
            Nu opnieuw proberen
          </button>
        </form>
      </div>

      <ul className="mt-4 space-y-1.5">
        {mails.map((mail) => (
          <li
            key={mail.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/60 px-3 py-2 text-xs dark:bg-zinc-900/50"
          >
            <span className="font-medium text-zinc-900 dark:text-white">{mail.to}</span>
            <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{mail.subject}</span>
            {mail.source ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                {mail.source}
              </span>
            ) : null}
            <span className="text-slate-500 dark:text-slate-400" title={mail.lastError ?? undefined}>
              {mail.attempts}× geprobeerd
            </span>
            <form action={deleteOutboxMail.bind(null, mail.id)}>
              <button
                type="submit"
                aria-label="Uit de outbox verwijderen"
                className="rounded p-1 text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
              >
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
