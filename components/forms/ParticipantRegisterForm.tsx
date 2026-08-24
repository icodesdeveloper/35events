"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerParticipant, type RegisterState } from "@/app/(participant)/register/actions";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300";

export default function ParticipantRegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerParticipant, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="username">
          Gebruikersnaam
        </label>
        <input id="username" name="username" className={fieldClass} required />
        {errors.username ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.username}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="email">
          E-mailadres
        </label>
        <input id="email" name="email" type="email" className={fieldClass} required />
        {errors.email ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="password">
          Wachtwoord
        </label>
        <input id="password" name="password" type="password" className={fieldClass} required minLength={8} />
        {errors.password ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p> : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
      >
        {pending ? "Bezig..." : "Account aanmaken"}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Al een account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 dark:text-white">
          Inloggen
        </Link>
      </p>
    </form>
  );
}
