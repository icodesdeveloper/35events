"use client";

import { useState } from "react";
import type { EventMedia, EventMediaSection } from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faArrowDown, faTrash, faStar, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import SelectField from "@/components/admin/SelectField";
import DatePickerField from "@/components/admin/DatePickerField";
import Switch from "@/components/admin/Switch";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import SortableMediaGrid from "@/components/admin/SortableMediaGrid";
import MediaUploadForm from "@/components/admin/MediaUploadForm";
import { labelClass, fieldClass } from "@/components/forms/EventFormFields";
import { updateSection, deleteSection, moveSection } from "@/app/admin/(dashboard)/events/[id]/media/actions";

// The resolved (inherited-or-overridden) visibility is computed server-side in
// the page, so a collapsed section still shows at a glance who can see it —
// otherwise a collapsed list tells you nothing.
export type AdminMediaSection = EventMediaSection & {
  media: EventMedia[];
  effectiveVisibility: string;
};

const VISIBILITY_BADGE: Record<string, { label: string; className: string }> = {
  PUBLIC: { label: "Publiek", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  PARTICIPANTS_ONLY: { label: "Deelnemers", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  HIDDEN: { label: "Onzichtbaar", className: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400" },
};

function countLabel(media: EventMedia[]): string {
  const photos = media.filter((m) => m.type === "PHOTO").length;
  const videos = media.length - photos;
  if (media.length === 0) return "Leeg";

  const parts: string[] = [];
  if (photos > 0) parts.push(photos === 1 ? "1 foto" : `${photos} foto's`);
  if (videos > 0) parts.push(videos === 1 ? "1 video" : `${videos} video's`);
  return parts.join(" · ");
}

// Groups the settings form into labelled blocks instead of one flat list of
// switches — the overridden fields sit indented under the switch that turns
// them on, so it reads as "inherit, or these specific values".
function SettingsBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0 dark:border-zinc-800">
      <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{title}</p>
      {children}
    </div>
  );
}

export default function MediaSectionCard({
  eventId,
  section,
  isFirst,
  isLast,
  expanded,
  onToggleExpanded,
}: {
  eventId: string;
  section: AdminMediaSection;
  isFirst: boolean;
  isLast: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const [tab, setTab] = useState<"media" | "settings">("media");
  const [inheritVisibility, setInheritVisibility] = useState(section.inheritVisibility);
  const [inheritDownload, setInheritDownload] = useState(section.inheritDownload);
  const [scheduledDate, setScheduledDate] = useState(
    section.visibleFromDate ? section.visibleFromDate.toISOString().slice(0, 10) : "",
  );

  const badge = VISIBILITY_BADGE[section.effectiveVisibility] ?? VISIBILITY_BADGE.HIDDEN;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <FontAwesomeIcon
            icon={faChevronRight}
            className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          {section.isHighlight ? (
            <FontAwesomeIcon icon={faStar} className="h-3.5 w-3.5 shrink-0 text-amber-500" title="Highlight" />
          ) : null}
          <span className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{section.title}</span>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
          <span className="hidden shrink-0 text-xs text-slate-500 sm:inline dark:text-slate-400">
            {countLabel(section.media)}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
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

      {expanded ? (
        <>
          <div className="flex gap-1 border-t border-slate-200 px-3 pt-2 dark:border-zinc-800">
            {(
              [
                ["media", `Media${section.media.length > 0 ? ` (${section.media.length})` : ""}`],
                ["settings", "Instellingen"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === key
                    ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                    : "border-transparent text-slate-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "media" ? (
            <div className="border-t border-slate-200 p-4 dark:border-zinc-800">
              <MediaUploadForm eventId={eventId} sectionId={section.id} />
              <SortableMediaGrid eventId={eventId} sectionId={section.id} media={section.media} />
            </div>
          ) : (
            <form
              action={updateSection.bind(null, eventId, section.id)}
              className="space-y-4 border-t border-slate-200 p-4 dark:border-zinc-800"
            >
              <SettingsBlock title="Algemeen">
                <div className="mb-4">
                  <label className={labelClass}>Titel</label>
                  <input name="title" defaultValue={section.title} className={fieldClass} required />
                </div>
                {/* Switch is inline-flex, so each needs its own block wrapper
                    to stack instead of running together on one line. */}
                <div className="space-y-3">
                  <div>
                    <Switch
                      name="isHighlight"
                      defaultChecked={section.isHighlight}
                      label="Highlight — extra opvallend tonen"
                    />
                  </div>
                  <div>
                    <Switch
                      name="collapsedByDefault"
                      defaultChecked={section.collapsedByDefault}
                      label="Ingeklapt tonen op de publieke pagina — bezoeker klapt zelf open"
                    />
                  </div>
                </div>
              </SettingsBlock>

              <SettingsBlock title="Zichtbaarheid">
                <Switch
                  name="inheritVisibility"
                  checked={inheritVisibility}
                  onChange={(e) => setInheritVisibility(e.target.checked)}
                  label="Neemt over van event"
                />
                {!inheritVisibility ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 border-l-2 border-slate-200 pl-4 sm:grid-cols-3 dark:border-zinc-800">
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
                  </div>
                ) : null}
              </SettingsBlock>

              <SettingsBlock title="Downloadrechten">
                <Switch
                  name="inheritDownload"
                  checked={inheritDownload}
                  onChange={(e) => setInheritDownload(e.target.checked)}
                  label="Neemt over van event"
                />
                {!inheritDownload ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 border-l-2 border-slate-200 pl-4 sm:grid-cols-3 dark:border-zinc-800">
                    <div>
                      <label className={labelClass}>Wie mag downloaden</label>
                      <SelectField name="downloadPermission" defaultValue={section.downloadPermission}>
                        <option value="EVERYONE">Iedereen</option>
                        <option value="PARTICIPANTS_ONLY">Alleen deelnemers</option>
                        <option value="NOBODY">Niemand</option>
                      </SelectField>
                    </div>
                  </div>
                ) : null}
              </SettingsBlock>

              <div className="border-t border-slate-100 pt-4 dark:border-zinc-800">
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
                >
                  Sectie opslaan
                </button>
              </div>
            </form>
          )}
        </>
      ) : null}
    </div>
  );
}
