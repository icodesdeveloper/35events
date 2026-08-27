"use client";

import { useState } from "react";
import type { EventMedia, EventMediaSection } from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faArrowDown, faTrash, faStar } from "@fortawesome/free-solid-svg-icons";
import SelectField from "@/components/admin/SelectField";
import DatePickerField from "@/components/admin/DatePickerField";
import Switch from "@/components/admin/Switch";
import FileDropzone from "@/components/admin/FileDropzone";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import { labelClass, fieldClass } from "@/components/forms/EventFormFields";
import {
  updateSection,
  deleteSection,
  moveSection,
  uploadMedia,
  deleteMedia,
  moveMedia,
} from "@/app/admin/(dashboard)/events/[id]/media/actions";

export default function MediaSectionCard({
  eventId,
  section,
  isFirst,
  isLast,
}: {
  eventId: string;
  section: EventMediaSection & { media: EventMedia[] };
  isFirst: boolean;
  isLast: boolean;
}) {
  const [inheritVisibility, setInheritVisibility] = useState(section.inheritVisibility);
  const [inheritDownload, setInheritDownload] = useState(section.inheritDownload);
  const [scheduledDate, setScheduledDate] = useState(
    section.visibleFromDate ? section.visibleFromDate.toISOString().slice(0, 10) : "",
  );

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-zinc-800">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
          {section.isHighlight ? <FontAwesomeIcon icon={faStar} className="h-3.5 w-3.5 text-amber-500" /> : null}
          {section.title}
        </span>
        <div className="flex items-center gap-1">
          <form action={moveSection.bind(null, eventId, section.id, "up")}>
            <button
              type="submit"
              disabled={isFirst}
              className="rounded p-1.5 text-slate-400 transition-colors hover:text-zinc-900 disabled:opacity-30 dark:hover:text-white"
              aria-label="Sectie naar boven"
            >
              <FontAwesomeIcon icon={faArrowUp} className="h-3 w-3" />
            </button>
          </form>
          <form action={moveSection.bind(null, eventId, section.id, "down")}>
            <button
              type="submit"
              disabled={isLast}
              className="rounded p-1.5 text-slate-400 transition-colors hover:text-zinc-900 disabled:opacity-30 dark:hover:text-white"
              aria-label="Sectie naar beneden"
            >
              <FontAwesomeIcon icon={faArrowDown} className="h-3 w-3" />
            </button>
          </form>
          <form action={deleteSection.bind(null, eventId, section.id)}>
            <ConfirmSubmitButton
              confirmMessage="Deze sectie en alle media erin verwijderen?"
              className="rounded p-1.5 text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
              ariaLabel="Sectie verwijderen"
            >
              <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <form
        action={updateSection.bind(null, eventId, section.id)}
        className="grid grid-cols-1 gap-4 border-b border-slate-200 p-4 sm:grid-cols-3 dark:border-zinc-800"
      >
        <div className="sm:col-span-3">
          <label className={labelClass}>Titel</label>
          <input name="title" defaultValue={section.title} className={fieldClass} required />
        </div>

        <div className="sm:col-span-3">
          <Switch name="isHighlight" defaultChecked={section.isHighlight} label="Highlight — extra opvallend tonen" />
        </div>

        <div className="sm:col-span-3 border-t border-slate-100 pt-4 dark:border-zinc-800">
          <Switch
            name="inheritVisibility"
            checked={inheritVisibility}
            onChange={(e) => setInheritVisibility(e.target.checked)}
            label="Zichtbaarheid neemt over van event"
          />
        </div>
        {!inheritVisibility ? (
          <>
            <div>
              <label className={labelClass}>Zichtbaarheid</label>
              <SelectField name="visibility" defaultValue={section.visibility}>
                <option value="PUBLIC">Publiek</option>
                <option value="PARTICIPANTS_ONLY">Alleen deelnemers</option>
                <option value="HIDDEN">Onzichtbaar</option>
              </SelectField>
            </div>
            <div>
              <label className={labelClass}>Automatisch zichtbaar vanaf (optioneel)</label>
              <DatePickerField name="visibleFromDate" defaultValue={scheduledDate} onChange={setScheduledDate} />
            </div>
            <div>
              <label className={labelClass}>Naar welk niveau</label>
              <SelectField
                name="visibleFromTarget"
                defaultValue={section.visibleFromTarget ?? "PUBLIC"}
                disabled={!scheduledDate}
              >
                <option value="PUBLIC">Publiek</option>
                <option value="PARTICIPANTS_ONLY">Alleen deelnemers</option>
              </SelectField>
            </div>
          </>
        ) : null}

        <div className="sm:col-span-3 border-t border-slate-100 pt-4 dark:border-zinc-800">
          <Switch
            name="inheritDownload"
            checked={inheritDownload}
            onChange={(e) => setInheritDownload(e.target.checked)}
            label="Download neemt over van event"
          />
        </div>
        {!inheritDownload ? (
          <div>
            <label className={labelClass}>Downloadrechten</label>
            <SelectField name="downloadPermission" defaultValue={section.downloadPermission}>
              <option value="EVERYONE">Iedereen</option>
              <option value="PARTICIPANTS_ONLY">Alleen deelnemers</option>
              <option value="NOBODY">Niemand</option>
            </SelectField>
          </div>
        ) : null}

        <div className="sm:col-span-3">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
          >
            Sectie opslaan
          </button>
        </div>
      </form>

      <div className="p-4">
        <form action={uploadMedia.bind(null, eventId, section.id)} className="mb-6 space-y-3">
          <FileDropzone
            name="files"
            accept="image/*,video/*"
            multiple
            helpText="Foto's en video's, geen groottelimiet"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
          >
            Uploaden
          </button>
        </form>

        {section.media.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nog geen media in deze sectie.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {section.media.map((item, index) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="aspect-square w-full bg-zinc-950">
                  {item.type === "VIDEO" ? (
                    <video className="h-full w-full object-cover" src={`/api/media/${item.filePath}`} muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- served via app/api/media
                    <img src={`/api/media/${item.filePath}`} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex items-center justify-between p-2">
                  <div className="flex gap-1">
                    <form action={moveMedia.bind(null, eventId, section.id, item.id, "up")}>
                      <button
                        type="submit"
                        disabled={index === 0}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:text-zinc-900 disabled:opacity-30 dark:hover:text-white"
                        aria-label="Naar boven"
                      >
                        <FontAwesomeIcon icon={faArrowUp} className="h-3 w-3" />
                      </button>
                    </form>
                    <form action={moveMedia.bind(null, eventId, section.id, item.id, "down")}>
                      <button
                        type="submit"
                        disabled={index === section.media.length - 1}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:text-zinc-900 disabled:opacity-30 dark:hover:text-white"
                        aria-label="Naar beneden"
                      >
                        <FontAwesomeIcon icon={faArrowDown} className="h-3 w-3" />
                      </button>
                    </form>
                  </div>
                  <form action={deleteMedia.bind(null, eventId, item.id)}>
                    <ConfirmSubmitButton
                      confirmMessage="Dit mediabestand verwijderen?"
                      className="rounded p-1.5 text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                      ariaLabel="Verwijderen"
                    >
                      <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
