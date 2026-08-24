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
import { saveEventEdit, type EventEditState, type QuestionItem } from "@/app/admin/(dashboard)/events/[id]/edit/actions";
import { unpublishQuestionForm } from "@/app/admin/(dashboard)/events/[id]/questions/actions";

type DraftQuestion = {
  clientKey: string;
  id?: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string;
};

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
    options: q.options?.join("\n") ?? "",
  };
}

export default function EventEditWorkspace({
  eventId,
  formId,
  event,
  initialQuestions,
  initialDeadline,
  initialPublished,
  initialResponsesOpen,
}: {
  eventId: string;
  formId: string;
  event: EventFormData;
  initialQuestions: QuestionItem[];
  initialDeadline: string | null;
  initialPublished: boolean;
  initialResponsesOpen: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const boundAction = saveEventEdit.bind(null, eventId, formId);
  const [state, formAction, pending] = useActionState<EventEditState, FormData>(boundAction, {});

  const [questions, setQuestions] = useState<DraftQuestion[]>(() => initialQuestions.map(toDraft));
  const [published, setPublished] = useState(initialPublished);
  const [responsesOpen, setResponsesOpen] = useState(initialResponsesOpen);
  const [lastSyncedSavedAt, setLastSyncedSavedAt] = useState<number | undefined>(undefined);
  const [unpublishPending, startUnpublishTransition] = useTransition();

  // Resync local state with the server's response after a successful save —
  // React's documented "adjust state during render" pattern, not an effect —
  // crucial so newly-created questions pick up their real DB id (otherwise a
  // second save would re-create them instead of updating).
  if (state.savedAt !== undefined && state.savedAt !== lastSyncedSavedAt) {
    setLastSyncedSavedAt(state.savedAt);
    if (state.questions) setQuestions(state.questions.map(toDraft));
    if (state.published !== undefined) setPublished(state.published);
    if (state.responsesOpen !== undefined) setResponsesOpen(state.responsesOpen);
  }

  const fieldErrors = state.fieldErrors ?? {};
  const questionErrors = state.questionErrors ?? {};

  function updateQuestion(clientKey: string, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.clientKey === clientKey ? { ...q, ...patch } : q)));
  }

  function removeQuestion(clientKey: string) {
    setQuestions((prev) => prev.filter((q) => q.clientKey !== clientKey));
  }

  function addQuestionRow() {
    setQuestions((prev) => [
      ...prev,
      { clientKey: crypto.randomUUID(), type: "TEXT", label: "", required: false, options: "" },
    ]);
  }

  async function handleUnpublish() {
    const confirmed = await confirm({
      message:
        "De vragen verbergen voor deelnemers? Ze kunnen ze dan niet meer invullen totdat je opnieuw publiceert. Opslaan en (opnieuw) publiceren blijft gewoon mogelijk zonder dit te doen.",
    });
    if (!confirmed) return;
    startUnpublishTransition(async () => {
      await unpublishQuestionForm(eventId, formId);
      setPublished(false);
      router.refresh();
    });
  }

  const busy = pending || unpublishPending;
  const questionsJson = JSON.stringify(
    questions.map(({ clientKey, id, type, label, required, options }) => ({ clientKey, id, type, label, required, options })),
  );

  return (
    <form action={formAction}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">{event.name} bewerken</h1>
        <div className="flex items-center gap-3">
          {published ? (
            <>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Gepubliceerd
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={handleUnpublish}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-zinc-900 disabled:opacity-60 dark:text-slate-400 dark:hover:text-white"
                title="Verbergt de vragen weer voor deelnemers totdat je opnieuw publiceert. Niet nodig om wijzigingen op te slaan of te publiceren."
              >
                Verbergen voor deelnemers
              </button>
            </>
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
            value="publish"
            disabled={busy}
            onClick={async (clickEvent) => {
              clickEvent.preventDefault();
              const button = clickEvent.currentTarget;
              const message = published
                ? "Opnieuw publiceren stuurt meteen een mail naar alle huidige registranten dat er bijkomende info nodig is. Doorgaan?"
                : "Publiceren stuurt meteen een mail naar alle huidige registranten dat er bijkomende info nodig is. Doorgaan?";
              const confirmed = await confirm(message);
              if (confirmed) button.form?.requestSubmit(button);
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {published ? "Opnieuw publiceren" : "Publiceren"}
          </button>
        </div>
      </div>

      {state.error ? <p className="mb-4 text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <EventFormFields event={event} errors={fieldErrors} />

      <section id="vragen" className="mt-10 max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Bijkomende vragen</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Wijzigingen hieronder worden pas bewaard als je bovenaan op &ldquo;Concept opslaan&rdquo; of
              &ldquo;Publiceren&rdquo; klikt.
            </p>
          </div>
          <Link
            href={`/admin/events/${eventId}/questions/answers`}
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
          >
            Antwoorden bekijken
          </Link>
        </div>

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
                      onChange={(e) => updateQuestion(q.clientKey, { type: e.target.value as QuestionType })}
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
