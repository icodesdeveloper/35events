"use client";

import { useActionState, useState } from "react";
import { formatPrice } from "@/lib/format";
import { submitRegistration, type RegistrationFormState } from "@/app/(public)/events/[slug]/register/actions";
import SelectField from "@/components/admin/SelectField";
import { expandQuestionsForPassengers, type PassengerQuestion } from "@/lib/questionForms";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300";

export default function RegistrationForm({
  slug,
  price,
  passengerPrice,
  maxPassengers,
  questions,
}: {
  slug: string;
  price: string | null;
  passengerPrice: string | null;
  maxPassengers: number;
  questions: PassengerQuestion[];
}) {
  const action = submitRegistration.bind(null, slug);
  const [state, formAction, pending] = useActionState<RegistrationFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  const [passengerCount, setPassengerCount] = useState(0);
  const allowPassengers = maxPassengers > 0;

  const total = (price ? Number(price) : 0) + (allowPassengers ? passengerCount * Number(passengerPrice ?? 0) : 0);
  const expandedQuestions = expandQuestionsForPassengers(questions, allowPassengers ? passengerCount : 0);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="vehicleMake">
            Merk
          </label>
          <input id="vehicleMake" name="vehicleMake" className={fieldClass} required />
          {errors.vehicleMake ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleMake}</p>
          ) : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="vehicleModel">
            Model
          </label>
          <input id="vehicleModel" name="vehicleModel" className={fieldClass} required />
          {errors.vehicleModel ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleModel}</p>
          ) : null}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="vehicleType">
          Type (optioneel)
        </label>
        <input id="vehicleType" name="vehicleType" className={fieldClass} placeholder="bv. Cabrio, Coupé..." />
      </div>

      <div>
        <label className={labelClass} htmlFor="vehiclePhoto">
          Foto van je voertuig
        </label>
        <input id="vehiclePhoto" name="vehiclePhoto" type="file" accept="image/*" required className={fieldClass} />
        {errors.vehiclePhoto ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehiclePhoto}</p>
        ) : null}
      </div>

      {allowPassengers ? (
        <div>
          <label className={labelClass} htmlFor="passengerCount">
            Aantal passagiers (max. {maxPassengers}
            {passengerPrice ? `, +${formatPrice(passengerPrice)} per passagier` : ""})
          </label>
          <input
            id="passengerCount"
            name="passengerCount"
            type="number"
            min={0}
            max={maxPassengers}
            value={passengerCount}
            onChange={(e) => {
              const next = Math.max(0, Math.min(maxPassengers, Number(e.target.value) || 0));
              setPassengerCount(next);
            }}
            className={fieldClass}
          />
          {errors.passengerCount ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.passengerCount}</p>
          ) : null}
        </div>
      ) : null}

      <div>
        <label className={labelClass} htmlFor="discountCode">
          Kortingscode (optioneel)
        </label>
        <input id="discountCode" name="discountCode" className={fieldClass} placeholder="bv. VROEGBOEKER" />
        {errors.discountCode ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.discountCode}</p>
        ) : null}
      </div>

      {price || (allowPassengers && passengerPrice) ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Deelnameprijs: <span className="font-medium text-zinc-900 dark:text-white">{formatPrice(total)}</span> —
          betaling volgt nog, we nemen contact op met de details.
        </p>
      ) : null}

      {expandedQuestions.length > 0 ? (
        <div className="space-y-4 border-t border-slate-200 pt-5 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">Bijkomende vragen</p>
          {expandedQuestions.map(({ question, fieldName, personLabel }) => (
            <div key={fieldName}>
              <label className={labelClass} htmlFor={fieldName}>
                {question.label}
                {personLabel ? ` — ${personLabel}` : ""}
                {question.required ? <span className="text-red-500"> *</span> : null}
              </label>
              {question.type === "SELECT" ? (
                <SelectField id={fieldName} name={fieldName}>
                  <option value="">Kies...</option>
                  {question.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </SelectField>
              ) : (
                <input
                  id={fieldName}
                  name={fieldName}
                  type={question.type === "EMAIL" ? "email" : question.type === "NUMBER" ? "number" : "text"}
                  className={fieldClass}
                />
              )}
              {errors[fieldName] ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[fieldName]}</p> : null}
            </div>
          ))}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nog niet zeker? Je kan dit later nog aanvullen of wijzigen via je account.
          </p>
        </div>
      ) : null}

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
      >
        {pending ? "Bezig..." : "Registreren"}
      </button>
    </form>
  );
}
