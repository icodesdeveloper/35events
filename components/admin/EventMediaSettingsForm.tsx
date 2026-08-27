"use client";

import { useState } from "react";
import SelectField from "@/components/admin/SelectField";
import DatePickerField from "@/components/admin/DatePickerField";
import { updateEventMediaSettings } from "@/app/admin/(dashboard)/events/[id]/media/actions";
import { labelClass } from "@/components/forms/EventFormFields";

export default function EventMediaSettingsForm({
  eventId,
  mediaVisibility,
  mediaVisibleFromDate,
  mediaVisibleFromTarget,
  downloadPermission,
}: {
  eventId: string;
  mediaVisibility: string;
  mediaVisibleFromDate: string | null;
  mediaVisibleFromTarget: string | null;
  downloadPermission: string;
}) {
  const [scheduledDate, setScheduledDate] = useState(mediaVisibleFromDate ?? "");

  return (
    <form
      action={updateEventMediaSettings.bind(null, eventId)}
      className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="sm:col-span-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Media-instellingen voor dit event</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Standaardwaarden die elke sectie hieronder kan overnemen (of per sectie los kan instellen).
        </p>
      </div>

      <div>
        <label className={labelClass}>Zichtbaarheid</label>
        <SelectField name="mediaVisibility" defaultValue={mediaVisibility}>
          <option value="PUBLIC">Publiek</option>
          <option value="PARTICIPANTS_ONLY">Alleen deelnemers</option>
          <option value="HIDDEN">Onzichtbaar</option>
        </SelectField>
      </div>

      <div>
        <label className={labelClass}>Automatisch zichtbaar vanaf (optioneel)</label>
        <DatePickerField name="mediaVisibleFromDate" defaultValue={scheduledDate} onChange={setScheduledDate} />
      </div>

      <div>
        <label className={labelClass}>Naar welk niveau</label>
        <SelectField name="mediaVisibleFromTarget" defaultValue={mediaVisibleFromTarget ?? "PUBLIC"} disabled={!scheduledDate}>
          <option value="PUBLIC">Publiek</option>
          <option value="PARTICIPANTS_ONLY">Alleen deelnemers</option>
        </SelectField>
      </div>

      <div>
        <label className={labelClass}>Downloadrechten</label>
        <SelectField name="downloadPermission" defaultValue={downloadPermission}>
          <option value="EVERYONE">Iedereen</option>
          <option value="PARTICIPANTS_ONLY">Alleen deelnemers</option>
          <option value="NOBODY">Niemand</option>
        </SelectField>
      </div>

      <div className="flex items-end sm:col-span-3">
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
        >
          Opslaan
        </button>
      </div>
    </form>
  );
}
