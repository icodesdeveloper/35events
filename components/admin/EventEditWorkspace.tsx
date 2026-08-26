"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Reorder } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical, faFont, faEnvelope, faHashtag, faListUl, faTrash, faPlus } from "@fortawesome/free-solid-svg-icons";
import type { QuestionType } from "@/lib/validation/question";
import EventFormFields, { fieldClass, labelClass, type EventFormData } from "@/components/forms/EventFormFields";
import DatePickerField from "@/components/admin/DatePickerField";
import SelectField from "@/components/admin/SelectField";
import Checkbox from "@/components/admin/Checkbox";
import Switch from "@/components/admin/Switch";
import { useConfirm } from "@/components/admin/ConfirmDialogProvider";
import {
  saveEventEdit,
  discardEventDraft,
  type EventEditState,
  type QuestionItem,
  type EarlybirdPriceItem,
} from "@/app/admin/(dashboard)/events/[id]/edit/actions";
import { unpublishQuestionForm } from "@/app/admin/(dashboard)/events/[id]/questions/actions";

type DraftQuestion = {
  clientKey: string;
  id?: string;
  type: QuestionType;
  label: string;
  required: boolean;
  perPassenger: boolean;
  options: string;
};

type DraftEarlybirdPrice = { clientKey: string; id?: string; deadline: string; price: string };

function toEarlybirdDraft(e: EarlybirdPriceItem): DraftEarlybirdPrice {
  return { clientKey: e.id, id: e.id, deadline: e.deadline, price: e.price };
}

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

const TYPE_ICON: Record<QuestionType, typeof faFont> = {
  TEXT: faFont,
  EMAIL: faEnvelope,
  NUMBER: faHashtag,
  SELECT: faListUl,
};

function toDraft(q: QuestionItem): DraftQuestion {
  return {
    clientKey: q.id,
    id: q.id,
    type: q.type,
    label: q.label,
    required: q.required,
    perPassenger: q.perPassenger,
    options: q.options?.join("\n") ?? "",
  };
}

export default function EventEditWorkspace({
  eventId,
  formId,
  event,
  initialQuestions,
  initialDeadline,
  initialQuestionsPublished,
  initialResponsesOpen,
  initialEarlybirdPrices,
  initialHasDraft,
}: {
  eventId: string | null;
  formId: string | null;
  event: EventFormData;
  initialQuestions: QuestionItem[];
  initialDeadline: string | null;
  initialQuestionsPublished: boolean;
  initialResponsesOpen: boolean;
  initialEarlybirdPrices: EarlybirdPriceItem[];
  initialHasDraft: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const boundAction = saveEventEdit.bind(null, eventId, formId);
  const [state, formAction, pending] = useActionState<EventEditState, FormData>(boundAction, {});

  const [questions, setQuestions] = useState<DraftQuestion[]>(() => initialQuestions.map(toDraft));
  const [questionsPublished, setQuestionsPublished] = useState(initialQuestionsPublished);
  const [responsesOpen, setResponsesOpen] = useState(initialResponsesOpen);
  const [earlybirdPrices, setEarlybirdPrices] = useState<DraftEarlybirdPrice[]>(() =>
    initialEarlybirdPrices.map(toEarlybirdDraft),
  );
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [formKey, setFormKey] = useState(0);
  const [lastSyncedSavedAt, setLastSyncedSavedAt] = useState<number | undefined>(undefined);
  const [unpublishPending, startUnpublishTransition] = useTransition();
  const [discardPending, startDiscardTransition] = useTransition();

  // Resync local state with the server's response after a successful save —
  // React's documented "adjust state during render" pattern, not an effect —
  // crucial so newly-created questions/tiers pick up their real DB id
  // (otherwise a second save would re-create them instead of updating).
  if (state.savedAt !== undefined && state.savedAt !== lastSyncedSavedAt) {
    setLastSyncedSavedAt(state.savedAt);
    if (state.questions) setQuestions(state.questions.map(toDraft));
    if (state.questionsPublished !== undefined) setQuestionsPublished(state.questionsPublished);
    if (state.responsesOpen !== undefined) setResponsesOpen(state.responsesOpen);
    if (state.earlybirdPrices) setEarlybirdPrices(state.earlybirdPrices.map(toEarlybirdDraft));
    if (state.hasDraft !== undefined) setHasDraft(state.hasDraft);
  }

  const fieldErrors = state.fieldErrors ?? {};
  const questionErrors = state.questionErrors ?? {};
  const earlybirdErrors = state.earlybirdErrors ?? {};

  function updateQuestion(clientKey: string, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.clientKey === clientKey ? { ...q, ...patch } : q)));
  }

  function removeQuestion(clientKey: string) {
    setQuestions((prev) => prev.filter((q) => q.clientKey !== clientKey));
  }

  function addQuestionRow() {
    setQuestions((prev) => [
      ...prev,
      { clientKey: crypto.randomUUID(), type: "TEXT", label: "", required: false, perPassenger: false, options: "" },
    ]);
  }

  function updateEarlybirdRow(clientKey: string, patch: Partial<DraftEarlybirdPrice>) {
    setEarlybirdPrices((prev) => prev.map((e) => (e.clientKey === clientKey ? { ...e, ...patch } : e)));
  }

  function removeEarlybirdRow(clientKey: string) {
    setEarlybirdPrices((prev) => prev.filter((e) => e.clientKey !== clientKey));
  }

  function addEarlybirdRow() {
    setEarlybirdPrices((prev) => [...prev, { clientKey: crypto.randomUUID(), deadline: "", price: "" }]);
  }

  async function handleUnpublishQuestions() {
    const confirmed = await confirm({
      message:
        "De vragen verbergen voor deelnemers? Ze kunnen ze dan niet meer invullen totdat je opnieuw publiceert. Opslaan en (opnieuw) publiceren blijft gewoon mogelijk zonder dit te doen.",
    });
    if (!confirmed || !eventId || !formId) return;
    startUnpublishTransition(async () => {
      await unpublishQuestionForm(eventId, formId);
      setQuestionsPublished(false);
      router.refresh();
    });
  }

  async function handleDiscardDraft() {
    const confirmed = await confirm({
      title: "Concept verwerpen",
      message: "Je niet-gepubliceerde wijzigingen verwerpen? Dit kan niet ongedaan gemaakt worden.",
      confirmLabel: "Verwerpen",
      danger: true,
    });
    if (!confirmed || !eventId) return;
    startDiscardTransition(async () => {
      await discardEventDraft(eventId);
      setHasDraft(false);
      setFormKey((k) => k + 1);
      router.refresh();
    });
  }

  const busy = pending || unpublishPending || discardPending;
  const earlybirdPricesJson = JSON.stringify(
    earlybirdPrices.map(({ clientKey, id, deadline, price }) => ({ clientKey, id, deadline, price })),
  );
  const questionsJson = JSON.stringify(
    questions.map(({ clientKey, id, type, label, required, perPassenger, options }) => ({
      clientKey,
      id,
      type,
      label,
      required,
      perPassenger,
      options,
    })),
  );

  return (
    <form key={formKey} action={formAction}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            {eventId ? `${event.name} bewerken` : "Nieuw event"}
          </h1>
          <Switch name="published" label="Zichtbaar voor bezoekers" defaultChecked={event.published} />
        </div>
        <div className="flex items-center gap-3">
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
            value="publish"
            disabled={busy}
            onClick={async (clickEvent) => {
              clickEvent.preventDefault();
              const button = clickEvent.currentTarget;
              const message = event.published
                ? "Dit publiceert je wijzigingen meteen live. Doorgaan?"
                : "Dit event wordt zichtbaar voor bezoekers. Doorgaan?";
              const confirmed = await confirm(message);
              if (confirmed) button.form?.requestSubmit(button);
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {event.published ? "Wijzigingen publiceren" : "Publiceren"}
          </button>
        </div>
      </div>

      {hasDraft ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <span>Je hebt niet-gepubliceerde wijzigingen — bezoekers zien nog de huidige live versie.</span>
          <button
            type="button"
            disabled={busy}
            onClick={handleDiscardDraft}
            className="shrink-0 font-medium underline decoration-dotted hover:decoration-solid disabled:opacity-60"
          >
            Wijzigingen verwerpen
          </button>
        </div>
      ) : null}

      {state.error ? <p className="mb-4 text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <EventFormFields event={event} errors={fieldErrors} />

      <section className="mt-10 max-w-2xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Registratie</h2>
        </div>
        <Switch
          name="registrationOpen"
          label="Registratie open"
          defaultChecked={event.registrationOpen}
          className="mb-4"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Startdatum (optioneel)</label>
            <DatePickerField
              name="registrationStartDate"
              defaultValue={toDateInputValue(event.registrationStartDate)}
            />
          </div>
          <div>
            <label className={labelClass}>Einddatum (optioneel)</label>
            <DatePickerField name="registrationEndDate" defaultValue={toDateInputValue(event.registrationEndDate)} />
            {fieldErrors.registrationEndDate ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.registrationEndDate}</p>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          De schakelaar hierboven bepaalt altijd meteen of registreren nu kan. De datums zetten die schakelaar enkel
          automatisch om op het gekozen moment — daarna kan je hem gewoon manueel bijsturen.
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Earlybird pricing</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Geldt de eerstvolgende nog niet verstreken deadline hieronder niet meer (of zijn er geen), dan geldt de
            gewone deelnameprijs hierboven.
          </p>
        </div>

        <div className="space-y-2">
          {earlybirdPrices.map((tier) => (
            <div key={tier.clientKey}>
              <div className="flex items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex-1">
                  <label className={labelClass}>Deadline</label>
                  <DatePickerField
                    defaultValue={tier.deadline}
                    onChange={(value) => updateEarlybirdRow(tier.clientKey, { deadline: value })}
                  />
                </div>
                <div className="w-32">
                  <label className={labelClass}>Prijs (&euro;)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tier.price}
                    onChange={(e) => updateEarlybirdRow(tier.clientKey, { price: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeEarlybirdRow(tier.clientKey)}
                  aria-label="Verwijderen"
                  className="shrink-0 rounded p-2.5 text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                >
                  <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                </button>
              </div>
              {earlybirdErrors[tier.clientKey] ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{earlybirdErrors[tier.clientKey]}</p>
              ) : null}
            </div>
          ))}
        </div>

        {earlybirdPrices.length === 0 ? (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Nog geen earlybird-prijzen.</p>
        ) : null}

        <button
          type="button"
          onClick={addEarlybirdRow}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
        >
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
          Earlybird-prijs toevoegen
        </button>

        <input type="hidden" name="earlybirdPricesJson" value={earlybirdPricesJson} readOnly />
      </section>

      <section id="vragen" className="mt-10 max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Bijkomende vragen</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Wijzigingen hieronder worden pas bewaard als je bovenaan op &ldquo;Concept opslaan&rdquo; of
              &ldquo;Publiceren&rdquo; klikt.
            </p>
          </div>
          {eventId ? (
            <Link
              href={`/admin/events/${eventId}/questions/answers`}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
            >
              Antwoorden bekijken
            </Link>
          ) : null}
        </div>

        {eventId && formId ? (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {questionsPublished ? (
              <>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Vragen gepubliceerd
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleUnpublishQuestions}
                  className="text-sm font-medium text-slate-500 transition-colors hover:text-zinc-900 disabled:opacity-60 dark:text-slate-400 dark:hover:text-white"
                  title="Verbergt de vragen weer voor deelnemers totdat je opnieuw publiceert."
                >
                  Vragen verbergen voor deelnemers
                </button>
              </>
            ) : null}
            <button
              type="submit"
              name="intent"
              value="publish-questions"
              disabled={busy}
              onClick={async (clickEvent) => {
                clickEvent.preventDefault();
                const button = clickEvent.currentTarget;
                const message = questionsPublished
                  ? "Opnieuw publiceren stuurt meteen een mail naar alle huidige registranten dat er bijkomende info nodig is. Doorgaan?"
                  : "Publiceren stuurt meteen een mail naar alle huidige registranten dat er bijkomende info nodig is. Doorgaan?";
                const confirmed = await confirm(message);
                if (confirmed) button.form?.requestSubmit(button);
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
            >
              {questionsPublished ? "Vragen opnieuw publiceren" : "Vragen publiceren"}
            </button>
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-end gap-6">
          <div>
            <label className={labelClass}>Invul-deadline (optioneel)</label>
            <DatePickerField name="deadline" defaultValue={initialDeadline ?? ""} />
          </div>
          <Switch
            name="responsesOpen"
            label="Vragen openstaan voor deelnemers"
            checked={responsesOpen}
            onChange={(event) => setResponsesOpen(event.target.checked)}
          />
        </div>
        {!responsesOpen ? (
          <p className="mb-4 text-xs text-amber-700 dark:text-amber-400">
            Deelnemers kunnen nu geen antwoorden (meer) invullen of wijzigen, ongeacht de deadline — sla op om dit
            door te voeren.
          </p>
        ) : null}

        <Reorder.Group axis="y" values={questions} onReorder={setQuestions} className="space-y-2">
          {questions.map((q) => (
            <Reorder.Item
              key={q.clientKey}
              value={q}
              className="rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start gap-3 p-3">
                <FontAwesomeIcon
                  icon={faGripVertical}
                  className="mt-2.5 h-4 w-4 shrink-0 cursor-grab text-slate-300 dark:text-zinc-600"
                />
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-400">
                  <FontAwesomeIcon icon={TYPE_ICON[q.type]} className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem_auto]">
                    <input
                      value={q.label}
                      onChange={(e) => updateQuestion(q.clientKey, { label: e.target.value })}
                      placeholder="Bv. Welke hoofdgerecht kies je?"
                      className={fieldClass}
                    />
                    <SelectField
                      value={q.type}
                      onChange={(value) => updateQuestion(q.clientKey, { type: value as QuestionType })}
                    >
                      <option value="TEXT">Tekst</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="NUMBER">Nummer</option>
                      <option value="SELECT">Keuzelijst</option>
                    </SelectField>
                    <Checkbox
                      label="Verplicht"
                      className="whitespace-nowrap"
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.clientKey, { required: e.target.checked })}
                    />
                  </div>
                  <Checkbox
                    label="Per passagier stellen (bv. gerechtkeuze per persoon)"
                    checked={q.perPassenger}
                    onChange={(e) => updateQuestion(q.clientKey, { perPassenger: e.target.checked })}
                  />
                  {q.type === "SELECT" ? (
                    <textarea
                      value={q.options}
                      onChange={(e) => updateQuestion(q.clientKey, { options: e.target.value })}
                      rows={3}
                      placeholder={"Optie 1\nOptie 2"}
                      className={fieldClass}
                    />
                  ) : null}
                  {questionErrors[q.clientKey] ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{questionErrors[q.clientKey]}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.clientKey)}
                  aria-label="Verwijderen"
                  className="shrink-0 rounded p-1.5 text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                >
                  <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {questions.length === 0 ? (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Nog geen vragen toegevoegd.</p>
        ) : null}

        <button
          type="button"
          onClick={addQuestionRow}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
        >
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
          Vraag toevoegen
        </button>

        <input type="hidden" name="questionsJson" value={questionsJson} readOnly />
      </section>
    </form>
  );
}
