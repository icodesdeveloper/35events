"use client";

import { useActionState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import {
  addAdminAllowlistEntry,
  removeAdminAllowlistEntry,
  type AdminAllowlistFormState,
} from "@/app/admin/(dashboard)/admins/actions";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import Tooltip from "@/components/admin/Tooltip";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300";

const dateFormatter = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short", year: "numeric" });

export type AdminAllowlistItem = { id: string; email: string; label: string | null; createdAt: Date };

export default function AdminAllowlistManager({
  entries,
  bootstrapEmail,
}: {
  entries: AdminAllowlistItem[];
  bootstrapEmail: string | null;
}) {
  const [state, formAction, pending] = useActionState<AdminAllowlistFormState, FormData>(addAdminAllowlistEntry, {});
  const errors = state.fieldErrors ?? {};

  return (
    <div className="space-y-8">
      {bootstrapEmail ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-slate-300">
          <span className="font-medium text-zinc-900 dark:text-white">{bootstrapEmail}</span> heeft altijd
          adminrechten (ingesteld via de <code className="font-mono text-xs">ADMIN_BOOTSTRAP_EMAIL</code>
          omgevingsvariabele) — staat niet in onderstaande lijst, en kan er ook niet uit verwijderd worden.
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Admin toevoegen</h2>
        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className={labelClass} htmlFor="email">
              E-mailadres
            </label>
            <input id="email" name="email" type="email" placeholder="naam@voorbeeld.be" className={fieldClass} required />
            {errors.email ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p> : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="label">
              Label (optioneel)
            </label>
            <input id="label" name="label" placeholder="bv. naam van de persoon" className={fieldClass} />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
          >
            {pending ? "Bezig..." : "Toevoegen"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase dark:border-zinc-800 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">E-mailadres</th>
              <th className="px-5 py-3 font-medium">Label</th>
              <th className="px-5 py-3 font-medium">Toegevoegd op</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{entry.email}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{entry.label ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{dateFormatter.format(entry.createdAt)}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end">
                    <Tooltip label="Adminrechten intrekken">
                      <form action={removeAdminAllowlistEntry.bind(null, entry.id)}>
                        <ConfirmSubmitButton
                          confirmMessage={`Adminrechten voor "${entry.email}" intrekken?`}
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
            ))}
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nog geen extra admins toegevoegd.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
