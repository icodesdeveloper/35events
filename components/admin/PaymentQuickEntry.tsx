"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleExclamation, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { recordPayment } from "@/app/admin/(dashboard)/payments/actions";
import { PAYMENT_BALANCE_LABEL } from "@/lib/payments";

type LogEntry = { id: string; tone: "success" | "warning" | "error"; message: string };

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-slate-300";

const priceFormatter = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });

export default function PaymentQuickEntry() {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pending, startTransition] = useTransition();
  const codeRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim() || !amount.trim()) return;
    const submittedCode = code.trim();
    const submittedAmount = amount.trim();

    startTransition(async () => {
      const result = await recordPayment(submittedCode, submittedAmount);
      const id = crypto.randomUUID();

      if (!result.ok) {
        const entry: LogEntry = { id, tone: "error", message: result.error };
        setLog((prev) => [entry, ...prev].slice(0, 15));
      } else {
        const tone: LogEntry["tone"] = result.balance === "PAID" ? "success" : result.balance === "OVERPAID" ? "warning" : "warning";
        const statusText =
          result.balance === "PAID" && result.confirmed
            ? "volledig betaald, bevestigd"
            : PAYMENT_BALANCE_LABEL[result.balance].toLowerCase();
        setLog((prev) =>
          [
            {
              id,
              tone,
              message: `${priceFormatter.format(result.amount)} ontvangen voor ${result.participant} · ${result.eventName} — ${statusText} (${priceFormatter.format(result.totalReceived)} / ${priceFormatter.format(result.expected)})`,
            },
            ...prev,
          ].slice(0, 15),
        );
      }

      setCode("");
      setAmount("");
      codeRef.current?.focus();
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-white">Overschrijving invoeren</h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Typ de code, druk Tab, typ het ontvangen bedrag, druk Enter.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className={labelClass}>Uniek nummer</label>
          <input
            ref={codeRef}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            className={`${fieldClass} font-mono tracking-wider uppercase`}
            autoFocus
            autoComplete="off"
            placeholder="A3K9F2"
          />
        </div>
        <div className="w-36">
          <label className={labelClass}>Ontvangen bedrag</label>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={fieldClass}
            inputMode="decimal"
            autoComplete="off"
            placeholder="35,00"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
        >
          Toevoegen
        </button>
      </form>

      {log.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm dark:border-zinc-800">
          {log.map((entry) => (
            <li
              key={entry.id}
              className={`flex items-start gap-2 ${
                entry.tone === "error"
                  ? "text-red-600 dark:text-red-400"
                  : entry.tone === "warning"
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              <FontAwesomeIcon
                icon={
                  entry.tone === "error"
                    ? faCircleExclamation
                    : entry.tone === "warning"
                      ? faTriangleExclamation
                      : faCircleCheck
                }
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
              />
              {entry.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
