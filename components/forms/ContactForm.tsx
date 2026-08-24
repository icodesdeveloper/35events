"use client";

import { useActionState } from "react";
import { submitContact, type ContactFormState } from "@/app/(public)/actions";

const fieldClass =
  "w-full border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-accent focus:outline-none";
const labelClass = "font-mono-label mb-1.5 block text-xs text-white/60";

export default function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(submitContact, {});
  const errors = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <p className="text-sm text-white/70">
        Bedankt! Je aanvraag is verstuurd — we hebben je ook een bevestiging gemaild.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">
            Naam
          </label>
          <input id="name" name="name" className={fieldClass} required />
          {errors.name ? <p className="mt-1 text-xs text-red-400">{errors.name}</p> : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" className={fieldClass} required />
          {errors.email ? <p className="mt-1 text-xs text-red-400">{errors.email}</p> : null}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="message">
          Bericht
        </label>
        <textarea id="message" name="message" rows={5} className={fieldClass} required />
        {errors.message ? <p className="mt-1 text-xs text-red-400">{errors.message}</p> : null}
      </div>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="border-accent text-accent hover:bg-accent border px-5 py-2.5 text-sm font-medium transition-colors hover:text-zinc-950 disabled:opacity-60"
      >
        {pending ? "Bezig..." : "Versturen"}
      </button>
    </form>
  );
}
