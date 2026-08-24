"use client";

import { useActionState } from "react";
import type { EventFormState } from "@/app/admin/(dashboard)/events/actions";
import EventFormFields, { type EventFormData } from "@/components/forms/EventFormFields";

export type { EventFormData };

export default function EventForm({
  action,
  event,
}: {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  event?: EventFormData;
}) {
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <EventFormFields event={event} errors={errors} />

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
      >
        {pending ? "Bezig..." : "Opslaan"}
      </button>
    </form>
  );
}
