"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faFileLines } from "@fortawesome/free-solid-svg-icons";
import RichTextEditor, { type RichTextEditorHandle } from "@/components/admin/RichTextEditor";
import DatePickerField from "@/components/admin/DatePickerField";
import Checkbox from "@/components/admin/Checkbox";
import MultiCombobox from "@/components/admin/MultiCombobox";
import { useConfirm } from "@/components/admin/ConfirmDialogProvider";
import { formatEventDate } from "@/lib/format";
import { CAMPAIGN_TEMPLATES } from "@/lib/mail/campaignTemplates";
import {
  saveCampaign,
  unscheduleCampaign,
  previewAudience,
  type CampaignFormState,
} from "@/app/admin/(dashboard)/communications/actions";
import type { AudienceMode, CampaignRecipient } from "@/lib/campaigns";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white disabled:opacity-60";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "CONFIRMED", label: "Bevestigd / betaald" },
  { value: "PENDING_PAYMENT", label: "Geen betaling" },
  { value: "CANCELLED", label: "Geannuleerd" },
];

const STATUS_LABEL: Record<string, string> = { DRAFT: "Concept", SCHEDULED: "Gepland", SENT: "Verzonden" };

export type CampaignData = {
  id: string;
  subject: string;
  bodyHtml: string;
  status: "DRAFT" | "SCHEDULED" | "SENT";
  audienceMode: AudienceMode;
  eventIds: string[];
  statuses: string[];
  participantIds: string[];
  scheduledAt: string | null;
  sentAt: string | null;
  sentCount: number | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function CommunicationComposer({
  campaign,
  events,
  participants,
}: {
  campaign: CampaignData | null;
  events: { id: string; name: string; date: Date }[];
  participants: { id: string; username: string; email: string }[];
}) {
  const confirm = useConfirm();
  const boundAction = saveCampaign.bind(null, campaign?.id ?? null);
  const [state, formAction, pending] = useActionState<CampaignFormState, FormData>(boundAction, {});
  const errors = state.fieldErrors ?? {};

  const readOnly = campaign?.status === "SENT";
  const [audienceMode, setAudienceMode] = useState<AudienceMode>(campaign?.audienceMode ?? "ALL_PARTICIPANTS");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>(campaign?.eventIds ?? []);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    campaign?.statuses ?? STATUS_OPTIONS.map((s) => s.value),
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(campaign?.participantIds ?? []);
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [scheduledDate, setScheduledDate] = useState(campaign?.scheduledAt?.slice(0, 10) ?? "");
  const [scheduledTime, setScheduledTime] = useState(
    campaign?.scheduledAt ? campaign.scheduledAt.slice(11, 16) : "10:00",
  );
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [unschedulePending, startUnscheduleTransition] = useTransition();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPending, startPreviewTransition] = useTransition();
  const [recipients, setRecipients] = useState<CampaignRecipient[] | null>(null);

  const richTextRef = useRef<RichTextEditorHandle>(null);

  // Live doelgroep-overzicht: elke wijziging aan de doelgroep-selectie
  // herberekent automatisch het aantal/de lijst ontvangers, ook meteen bij
  // het openen van de pagina — geen aparte "ververs"-knop meer nodig.
  useEffect(() => {
    startPreviewTransition(async () => {
      const result = await previewAudience(audienceMode, selectedEventIds, selectedStatuses, selectedParticipantIds);
      setRecipients(result);
    });
  }, [audienceMode, selectedEventIds, selectedStatuses, selectedParticipantIds]);

  function toggleEvent(eventId: string, checked: boolean) {
    setSelectedEventIds((prev) => (checked ? [...prev, eventId] : prev.filter((id) => id !== eventId)));
  }

  function toggleStatus(status: string, checked: boolean) {
    setSelectedStatuses((prev) => (checked ? [...prev, status] : prev.filter((s) => s !== status)));
  }

  function applyTemplate(templateId: string) {
    const template = CAMPAIGN_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setSubject(template.subject);
    richTextRef.current?.setContent(template.bodyHtml);
    setShowTemplatePicker(false);
  }

  async function handleSendClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const button = event.currentTarget;
    const count = recipients?.length ?? 0;
    const confirmed = await confirm({
      title: "Communicatie versturen",
      message: `Dit verstuurt de mail nu naar ${count} ${count === 1 ? "ontvanger" : "ontvangers"}. Dit kan niet ongedaan gemaakt worden.`,
      confirmLabel: "Verzenden",
      danger: true,
    });
    if (confirmed) button.form?.requestSubmit(button);
  }

  async function handleScheduleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const button = event.currentTarget;
    if (!scheduledDate || !scheduledTime) {
      await confirm({ title: "Ontbrekende datum", message: "Kies eerst een datum en tijdstip." });
      return;
    }
    const count = recipients?.length ?? 0;
    const moment = dateTimeFormatter.format(new Date(`${scheduledDate}T${scheduledTime}`));
    const confirmed = await confirm({
      title: "Communicatie plannen",
      message: `Dit plant de mail in voor verzending op ${moment}, naar ${count} ${count === 1 ? "ontvanger" : "ontvangers"}. Dit kan niet ongedaan gemaakt worden.`,
      confirmLabel: "Plannen",
      danger: true,
    });
    if (confirmed) button.form?.requestSubmit(button);
  }

  async function handleUnschedule() {
    if (!campaign) return;
    startUnscheduleTransition(async () => {
      await unscheduleCampaign(campaign.id);
    });
  }

  const busy = pending || unschedulePending;
  const participantOptions = participants.map((p) => ({ value: p.id, label: `${p.username} (${p.email})` }));

  return (
    <form action={formAction} className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            {campaign ? "Communicatie bewerken" : "Nieuw bericht"}
          </h1>
          {campaign ? (
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                campaign.status === "SENT"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : campaign.status === "SCHEDULED"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400"
              }`}
            >
              {STATUS_LABEL[campaign.status]}
              {campaign.status === "SCHEDULED" && campaign.scheduledAt
                ? ` · ${dateTimeFormatter.format(new Date(campaign.scheduledAt))}`
                : null}
              {campaign.status === "SENT" && campaign.sentAt
                ? ` · ${dateTimeFormatter.format(new Date(campaign.sentAt))} · ${campaign.sentCount ?? 0} ontvangers`
                : null}
            </span>
          ) : null}
        </div>

        {!readOnly ? (
          <div className="flex items-center gap-3">
            {campaign?.status === "SCHEDULED" ? (
              <button
                type="button"
                disabled={busy}
                onClick={handleUnschedule}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-zinc-900 disabled:opacity-60 dark:text-slate-400 dark:hover:text-white"
              >
                Terug naar concept
              </button>
            ) : null}
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={busy}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
            >
              {pending ? "Bezig..." : "Concept opslaan"}
            </button>
            <button
              type="submit"
              name="intent"
              value="schedule"
              disabled={busy}
              onClick={handleScheduleClick}
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
            >
              Gepland verzenden
            </button>
            <button
              type="submit"
              name="intent"
              value="send"
              disabled={busy}
              onClick={handleSendClick}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              Verzenden
            </button>
          </div>
        ) : null}
      </div>

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
      {state.notice ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {state.notice}
        </p>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Doelgroep</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-2.5 text-sm text-zinc-700 dark:text-slate-300">
            <input
              type="radio"
              name="audienceMode"
              value="ALL_PARTICIPANTS"
              checked={audienceMode === "ALL_PARTICIPANTS"}
              onChange={() => setAudienceMode("ALL_PARTICIPANTS")}
              disabled={readOnly}
            />
            Alle geregistreerde gebruikers
          </label>
          <label className="flex items-center gap-2.5 text-sm text-zinc-700 dark:text-slate-300">
            <input
              type="radio"
              name="audienceMode"
              value="EVENTS"
              checked={audienceMode === "EVENTS"}
              onChange={() => setAudienceMode("EVENTS")}
              disabled={readOnly}
            />
            Op basis van event(s)
          </label>

          {audienceMode === "EVENTS" ? (
            <div className="ml-6 space-y-4 border-l border-slate-200 pl-4 dark:border-zinc-800">
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {events.map((event) => (
                  <label key={event.id} className="flex items-center gap-2.5 text-sm text-zinc-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      name="eventIds"
                      value={event.id}
                      checked={selectedEventIds.includes(event.id)}
                      onChange={(e) => toggleEvent(event.id, e.target.checked)}
                      disabled={readOnly}
                    />
                    {event.name} <span className="text-slate-400 dark:text-slate-500">— {formatEventDate(event.date)}</span>
                  </label>
                ))}
                {events.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Geen events.</p> : null}
              </div>
              <div className="flex flex-wrap gap-4">
                {STATUS_OPTIONS.map((option) => (
                  <Checkbox
                    key={option.value}
                    label={option.label}
                    name="statuses"
                    value={option.value}
                    checked={selectedStatuses.includes(option.value)}
                    onChange={(e) => toggleStatus(option.value, e.target.checked)}
                    disabled={readOnly}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <label className="flex items-center gap-2.5 text-sm text-zinc-700 dark:text-slate-300">
            <input
              type="radio"
              name="audienceMode"
              value="SPECIFIC_PARTICIPANTS"
              checked={audienceMode === "SPECIFIC_PARTICIPANTS"}
              onChange={() => setAudienceMode("SPECIFIC_PARTICIPANTS")}
              disabled={readOnly}
            />
            Specifieke gebruikers
          </label>

          {audienceMode === "SPECIFIC_PARTICIPANTS" ? (
            <div className="ml-6 border-l border-slate-200 pl-4 dark:border-zinc-800">
              <MultiCombobox
                name="participantIds"
                values={selectedParticipantIds}
                onChange={setSelectedParticipantIds}
                options={participantOptions}
                placeholder="Zoek gebruikers op naam of e-mail..."
                disabled={readOnly}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          {recipients === null ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Overzicht laden...</p>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setPreviewOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-white"
              >
                {previewPending ? "Bijwerken..." : `${recipients.length} ${recipients.length === 1 ? "ontvanger" : "ontvangers"}`}
                <FontAwesomeIcon icon={previewOpen ? faChevronUp : faChevronDown} className="h-3 w-3 text-slate-400" />
              </button>
              {previewOpen ? (
                <div className="max-h-56 overflow-y-auto border-t border-slate-200 px-4 py-3 dark:border-zinc-800">
                  {recipients.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Geen ontvangers voor deze doelgroep.</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                      {recipients.map((r) => (
                        <li key={r.id}>
                          {r.username} <span className="text-slate-400 dark:text-slate-500">· {r.email}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Bericht</h2>
          {!readOnly ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplatePicker((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
              >
                <FontAwesomeIcon icon={faFileLines} className="h-3.5 w-3.5" />
                Kies een template
              </button>
              {showTemplatePicker ? (
                <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  {CAMPAIGN_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template.id)}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-zinc-800"
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mb-4">
          <label className={labelClass} htmlFor="subject">
            Onderwerp
          </label>
          <input
            id="subject"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={readOnly}
            className={fieldClass}
          />
        </div>

        <RichTextEditor
          ref={richTextRef}
          name="bodyHtml"
          defaultValue={campaign?.bodyHtml}
          placeholder="Schrijf je bericht..."
        />
      </section>

      {!readOnly ? (
        <section className="max-w-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Gepland verzenden op</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Datum</label>
              <DatePickerField name="scheduledDate" defaultValue={scheduledDate} onChange={setScheduledDate} />
              {errors.scheduledDate ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.scheduledDate}</p>
              ) : null}
            </div>
            <div>
              <label className={labelClass} htmlFor="scheduledTime">
                Tijdstip
              </label>
              <input
                id="scheduledTime"
                name="scheduledTime"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </section>
      ) : null}
    </form>
  );
}
