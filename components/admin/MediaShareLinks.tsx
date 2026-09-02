"use client";

import { useState } from "react";
import type { EventMediaShareLink } from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCheck, faBan, faTrash, faLink } from "@fortawesome/free-solid-svg-icons";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import { fieldClass } from "@/components/forms/EventFormFields";
import { createShareLink, revokeShareLink, deleteShareLink } from "@/app/admin/(dashboard)/events/[id]/media/actions";

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return; // clipboard blocked (insecure origin / denied) — the link stays selectable below
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
    >
      <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="h-3 w-3" />
      {copied ? "Gekopieerd" : "Kopieer"}
    </button>
  );
}

export default function MediaShareLinks({
  eventId,
  links,
  baseUrl,
}: {
  eventId: string;
  links: EventMediaShareLink[];
  // Passed in from the server so the copied link uses the real public domain
  // rather than whatever host the admin happens to be browsing on.
  baseUrl: string;
}) {
  const active = links.filter((link) => link.revokedAt === null);
  const revoked = links.filter((link) => link.revokedAt !== null);

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Deel-links</h2>
      <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-slate-400">
        Wie zo&apos;n link opent ziet deze media als een deelnemer — dus ook secties die op{" "}
        <em>Alleen deelnemers</em> staan, zonder account. Secties op <em>Onzichtbaar</em> blijven verborgen.
        Handig om in WhatsApp te delen. Trek een link in om de toegang meteen te stoppen.
      </p>

      {active.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {active.map((link) => {
            const url = `${baseUrl}/media/share/${link.token}`;
            return (
              <li
                key={link.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-800"
              >
                <FontAwesomeIcon icon={faLink} className="h-3 w-3 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  {link.label ? (
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{link.label}</p>
                  ) : null}
                  <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">{url}</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    {link.lastUsedAt
                      ? `Laatst gebruikt ${link.lastUsedAt.toLocaleDateString("nl-BE")}`
                      : "Nog niet gebruikt"}
                  </p>
                </div>
                <CopyButton url={url} />
                <form action={revokeShareLink.bind(null, eventId, link.id)}>
                  <ConfirmSubmitButton
                    confirmMessage="Deze link intrekken? Iedereen die hem heeft verliest meteen toegang."
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-300 hover:text-red-600 dark:border-zinc-700 dark:hover:text-red-400"
                    ariaLabel="Link intrekken"
                  >
                    <FontAwesomeIcon icon={faBan} className="h-3 w-3" />
                    Intrekken
                  </ConfirmSubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Nog geen actieve deel-link.</p>
      )}

      <form action={createShareLink.bind(null, eventId)} className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300" htmlFor="shareLabel">
            Nieuwe link (optioneel label)
          </label>
          <input id="shareLabel" name="label" placeholder="bv. WhatsApp-groep Kusttoer" className={fieldClass} />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
        >
          Link genereren
        </button>
      </form>

      {revoked.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-slate-500 dark:text-slate-400">
            {revoked.length} ingetrokken link{revoked.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 space-y-1">
            {revoked.map((link) => (
              <li key={link.id} className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <span className="min-w-0 flex-1 truncate line-through">{link.label ?? link.token}</span>
                <form action={deleteShareLink.bind(null, eventId, link.id)}>
                  <button
                    type="submit"
                    className="rounded p-1 transition-colors hover:text-red-600 dark:hover:text-red-400"
                    aria-label="Definitief verwijderen"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
