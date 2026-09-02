"use client";

import { useActionState, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import {
  adminCreateRegistration,
  type AdminCreateRegistrationState,
} from "@/app/admin/(dashboard)/events/[id]/registrations/actions";
import SelectField from "@/components/admin/SelectField";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300";

export default function ManualRegistrationForm({
  eventId,
  participants,
  maxPassengers,
}: {
  eventId: string;
  participants: { id: string; username: string; email: string }[];
  maxPassengers: number;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "email">("existing");
  const boundAction = adminCreateRegistration.bind(null, eventId);
  const [state, formAction, pending] = useActionState<AdminCreateRegistrationState, FormData>(boundAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-white"
      >
        <span className="inline-flex items-center gap-2">
          <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5 text-slate-400" />
          Gebruiker manueel registreren
        </span>
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="h-3 w-3 text-slate-400" />
      </button>
      {open ? (
        <form action={formAction} className="grid grid-cols-1 gap-4 border-t border-slate-200 p-4 sm:grid-cols-2 dark:border-zinc-800">
          <div className="sm:col-span-2">
            <input type="hidden" name="participantMode" value={mode} />

            <div className="mb-3 inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-zinc-700">
              {(
                [
                  ["existing", "Bestaande gebruiker"],
                  ["email", "Nieuw via e-mail"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === value
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "text-slate-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "existing" ? (
              <>
                <label className={labelClass}>Gebruiker</label>
                <SelectField name="participantId" searchable>
                  <option value="">Kies een gebruiker...</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.username} ({p.email})
                    </option>
                  ))}
                </SelectField>
                {errors.participantId ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.participantId}</p>
                ) : null}
                {participants.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Iedereen is al geregistreerd voor dit event.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <label className={labelClass} htmlFor="newParticipantEmail">
                  E-mailadres
                </label>
                <input
                  id="newParticipantEmail"
                  name="newParticipantEmail"
                  type="email"
                  placeholder="vriend@voorbeeld.be"
                  className={fieldClass}
                />
                {errors.newParticipantEmail ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.newParticipantEmail}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Maakt een account zonder wachtwoord aan. Deze persoon krijgt de bevestigingsmail en kan
                    inloggen via een login-link. Bestaat het adres al, dan wordt dat account gebruikt.
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label className={labelClass}>Merk</label>
            <input name="vehicleMake" className={fieldClass} placeholder="bv. Onbekend" />
            {errors.vehicleMake ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleMake}</p> : null}
          </div>
          <div>
            <label className={labelClass}>Model</label>
            <input name="vehicleModel" className={fieldClass} placeholder="bv. Onbekend" />
            {errors.vehicleModel ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleModel}</p> : null}
          </div>

          <div>
            <label className={labelClass}>Type (optioneel)</label>
            <input name="vehicleType" className={fieldClass} placeholder="bv. Cabrio, Coupé..." />
          </div>

          {maxPassengers > 0 ? (
            <div>
              <label className={labelClass}>Aantal passagiers</label>
              <input
                name="passengerCount"
                type="number"
                min={0}
                max={maxPassengers}
                defaultValue={0}
                className={fieldClass}
              />
              {errors.passengerCount ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.passengerCount}</p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className={labelClass}>Betaalstatus</label>
            <SelectField name="paymentStatus" defaultValue="PENDING_PAYMENT">
              <option value="PENDING_PAYMENT">In afwachting</option>
              <option value="CONFIRMED">Bevestigd</option>
            </SelectField>
          </div>

          {state.error ? <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{state.error}</p> : null}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
            >
              {pending ? "Bezig..." : "Registreren"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
