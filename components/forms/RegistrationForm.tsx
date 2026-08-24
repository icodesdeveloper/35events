"use client";

import { useActionState } from "react";
import { formatPrice } from "@/lib/format";
import { submitRegistration, type RegistrationFormState } from "@/app/(public)/events/[slug]/register/actions";
import Checkbox from "@/components/admin/Checkbox";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300";

export default function RegistrationForm({
  slug,
  price,
  passengerPrice,
}: {
  slug: string;
  price: string | null;
  passengerPrice: string | null;
}) {
  const action = submitRegistration.bind(null, slug);
  const [state, formAction, pending] = useActionState<RegistrationFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

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

      {passengerPrice ? (
        <Checkbox name="hasPassenger" label={`Ik kom met een passagier (+${formatPrice(passengerPrice)})`} />
      ) : null}

      {price ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Deelnameprijs: <span className="font-medium text-zinc-900 dark:text-white">{formatPrice(price)}</span> —
          betaling volgt nog, we nemen contact op met de details.
        </p>
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
