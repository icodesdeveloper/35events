"use client";

import { useActionState } from "react";
import { verifyMagicLink, type VerifyMagicLinkState } from "@/app/(participant)/magic-link/verify/actions";

export default function MagicLinkVerifyForm({
  email,
  token,
  callbackUrl,
}: {
  email: string;
  token: string;
  callbackUrl: string;
}) {
  const action = verifyMagicLink.bind(null, email, token, callbackUrl);
  const [state, formAction, pending] = useActionState<VerifyMagicLinkState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
      >
        {pending ? "Bezig..." : "Inloggen"}
      </button>
    </form>
  );
}
