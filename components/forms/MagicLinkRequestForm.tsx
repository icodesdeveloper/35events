"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestMagicLink, type MagicLinkState } from "@/app/(participant)/magic-link/actions";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";

export default function MagicLinkRequestForm() {
  const [state, formAction, pending] = useActionState<MagicLinkState, FormData>(requestMagicLink, {});

  if (state.sent) {
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-400">
        Check je mailbox — we hebben je een login-link gestuurd (geldig voor 24 uur).
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300" htmlFor="email">
          E-mailadres
        </label>
        <input id="email" name="email" type="email" className={fieldClass} required />
      </div>

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
      >
        {pending ? "Bezig..." : "Stuur login-link"}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/login" className="font-medium text-zinc-900 dark:text-white">
          Inloggen met wachtwoord
        </Link>
      </p>
    </form>
  );
}
