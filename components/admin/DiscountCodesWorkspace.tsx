"use client";

import { useActionState, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { formatPrice } from "@/lib/format";
import {
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  type DiscountCodeFormState,
} from "@/app/admin/(dashboard)/discount-codes/actions";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import Tooltip from "@/components/admin/Tooltip";
import SelectField from "@/components/admin/SelectField";
import DatePickerField from "@/components/admin/DatePickerField";

export type DiscountCodeItem = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  eventId: string | null;
  eventName: string | null;
  participantId: string | null;
  participantName: string | null;
  validFrom: string | null;
  validUntil: string | null;
  maxUses: number | null;
  useCount: number;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300";

function valueLabel(item: Pick<DiscountCodeItem, "type" | "value">): string {
  return item.type === "PERCENT" ? `${item.value}%` : formatPrice(item.value);
}

export default function DiscountCodesWorkspace({
  discountCodes,
  events,
  participants,
}: {
  discountCodes: DiscountCodeItem[];
  events: { id: string; name: string }[];
  participants: { id: string; username: string; email: string }[];
}) {
  const [editing, setEditing] = useState<DiscountCodeItem | null>(null);
  const action = editing ? updateDiscountCode.bind(null, editing.id) : createDiscountCode;
  const [state, formAction, pending] = useActionState<DiscountCodeFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};
  const [formKey, setFormKey] = useState(0);

  function startEdit(item: DiscountCodeItem) {
    setEditing(item);
    setFormKey((k) => k + 1);
  }

  function cancelEdit() {
    setEditing(null);
    setFormKey((k) => k + 1);
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {editing ? `Kortingscode "${editing.code}" bewerken` : "Nieuwe kortingscode"}
          </h2>
          {editing ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-zinc-900 dark:hover:text-white"
            >
              <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
              Annuleren
            </button>
          ) : null}
        </div>
        <form key={formKey} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="code">
              Code
            </label>
            <input
              id="code"
              name="code"
              defaultValue={editing?.code ?? ""}
              placeholder="bv. VROEGBOEKER"
              className={`${fieldClass} uppercase`}
              required
            />
            {errors.code ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.code}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass} htmlFor="type">
                Type
              </label>
              <SelectField id="type" name="type" defaultValue={editing?.type ?? "PERCENT"}>
                <option value="PERCENT">Percentage</option>
                <option value="FIXED">Vast bedrag (&euro;)</option>
              </SelectField>
            </div>
            <div>
              <label className={labelClass} htmlFor="value">
                Waarde
              </label>
              <input
                id="value"
                name="value"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editing?.value ?? ""}
                className={fieldClass}
                required
              />
              {errors.value ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.value}</p> : null}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="eventId">
              Geldig voor event
            </label>
            <SelectField id="eventId" name="eventId" defaultValue={editing?.eventId ?? ""}>
              <option value="">Alle events</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </SelectField>
          </div>

          <div>
            <label className={labelClass} htmlFor="participantId">
              Geldig voor gebruiker
            </label>
            <SelectField id="participantId" name="participantId" defaultValue={editing?.participantId ?? ""}>
              <option value="">Iedereen</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.username} ({participant.email})
                </option>
              ))}
            </SelectField>
          </div>

          <div>
            <label className={labelClass}>Geldig vanaf (optioneel)</label>
            <DatePickerField name="validFrom" defaultValue={editing?.validFrom ?? ""} />
          </div>

          <div>
            <label className={labelClass}>Geldig tot (optioneel)</label>
            <DatePickerField name="validUntil" defaultValue={editing?.validUntil ?? ""} />
          </div>

          <div>
            <label className={labelClass} htmlFor="maxUses">
              Max. aantal keer bruikbaar (optioneel)
            </label>
            <input
              id="maxUses"
              name="maxUses"
              type="number"
              min="1"
              step="1"
              defaultValue={editing?.maxUses ?? ""}
              className={fieldClass}
              placeholder="Onbeperkt"
            />
            {errors.maxUses ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.maxUses}</p> : null}
          </div>

          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
            >
              {pending ? "Bezig..." : editing ? "Opslaan" : "Aanmaken"}
            </button>
          </div>

          {state.error ? <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{state.error}</p> : null}
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase dark:border-zinc-800 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">Code</th>
              <th className="px-5 py-3 font-medium">Korting</th>
              <th className="px-5 py-3 font-medium">Event</th>
              <th className="px-5 py-3 font-medium">Gebruiker</th>
              <th className="px-5 py-3 font-medium">Geldigheid</th>
              <th className="px-5 py-3 font-medium">Gebruik</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {discountCodes.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-3 font-mono font-medium text-zinc-900 dark:text-white">{item.code}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{valueLabel(item)}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{item.eventName ?? "Alle events"}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{item.participantName ?? "Iedereen"}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  {item.validFrom ? item.validFrom : "—"} → {item.validUntil ? item.validUntil : "—"}
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  {item.useCount}
                  {item.maxUses != null ? ` / ${item.maxUses}` : ""}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Tooltip label="Kortingscode bewerken">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="text-slate-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
                        aria-label="Bewerken"
                      >
                        <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip label="Kortingscode verwijderen">
                      <form action={deleteDiscountCode.bind(null, item.id)}>
                        <ConfirmSubmitButton
                          confirmMessage={`Kortingscode "${item.code}" verwijderen?`}
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
            {discountCodes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                  Nog geen kortingscodes.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
