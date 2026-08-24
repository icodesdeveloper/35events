"use client";

import { useActionState } from "react";
import type { QuestionType } from "@prisma/client";
import {
  submitExtraInfoAnswers,
  type ExtraInfoState,
} from "@/app/(participant)/account/registrations/[id]/extra-info/actions";
import SelectField from "@/components/admin/SelectField";

export type ExtraInfoQuestionField = {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[] | null;
  defaultValue: string;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300";

export default function ExtraInfoForm({
  registrationId,
  questions,
}: {
  registrationId: string;
  questions: ExtraInfoQuestionField[];
}) {
  const action = submitExtraInfoAnswers.bind(null, registrationId);
  const [state, formAction, pending] = useActionState<ExtraInfoState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {questions.map((question) => (
        <div key={question.id}>
          <label className={labelClass} htmlFor={question.id}>
            {question.label} {question.required ? <span className="text-red-500">*</span> : null}
          </label>
          {question.type === "SELECT" ? (
            <SelectField id={question.id} name={question.id} defaultValue={question.defaultValue} required={question.required}>
              <option value="">Kies...</option>
              {question.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectField>
          ) : (
            <input
              id={question.id}
              name={question.id}
              type={question.type === "EMAIL" ? "email" : question.type === "NUMBER" ? "number" : "text"}
              defaultValue={question.defaultValue}
              className={fieldClass}
              required={question.required}
            />
          )}
          {errors[question.id] ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[question.id]}</p>
          ) : null}
        </div>
      ))}

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
