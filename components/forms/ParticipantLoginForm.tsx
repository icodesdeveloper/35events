"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginParticipant, type LoginState } from "@/app/(participant)/login/actions";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300";

export default function ParticipantLoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginParticipant, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/account"} />
      <div>
        <label className={labelClass} htmlFor="identifier">
          E-mail of gebruikersnaam
        </label>
        <input id="identifier" name="identifier" className={fieldClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="password">
          Wachtwoord
        </label>
        <input id="password" name="password" type="password" className={fieldClass} required />
      </div>

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
      >
        {pending ? "Bezig..." : "Inloggen"}
      </button>

      <div className="space-y-1 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>
          <Link href="/magic-link" className="font-medium text-zinc-900 dark:text-white">
            Login-link via e-mail
          </Link>
        </p>
        <p>
          Nog geen account?{" "}
          <Link href="/register" className="font-medium text-zinc-900 dark:text-white">
            Account aanmaken
          </Link>
        </p>
      </div>
    </form>
  );
}
