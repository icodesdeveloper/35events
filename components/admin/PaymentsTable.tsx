"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSort, faSortUp, faSortDown } from "@fortawesome/free-solid-svg-icons";
import type { PaymentStatus } from "@prisma/client";
import { PAYMENT_BALANCE_LABEL, type PaymentBalanceStatus } from "@/lib/payments";

export type PaymentRow = {
  registrationId: string;
  paymentReference: string;
  participant: string;
  eventId: string;
  eventName: string;
  expected: number;
  received: number;
  balance: PaymentBalanceStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
};

type FilterKey = "all" | PaymentBalanceStatus;

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Alles" },
  { key: "UNPAID", label: "Nog niets betaald" },
  { key: "PARTIAL", label: "Te weinig betaald" },
  { key: "OVERPAID", label: "Te veel betaald" },
  { key: "PAID", label: "Volledig betaald" },
];

const BALANCE_CLASS: Record<PaymentBalanceStatus, string> = {
  UNPAID: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400",
  PARTIAL: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  OVERPAID: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const priceFormatter = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });
const dateFormatter = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short", year: "numeric" });

type SortKey = "createdAt" | "participant" | "eventName" | "expected" | "received" | "balance";

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  const icon = !active ? faSort : dir === "asc" ? faSortUp : faSortDown;
  return <FontAwesomeIcon icon={icon} className="h-3 w-3" />;
}

export default function PaymentsTable({ rows, initialFilter }: { rows: PaymentRow[]; initialFilter?: FilterKey }) {
  const [filter, setFilter] = useState<FilterKey>(initialFilter ?? "all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  }

  const filtered = filter === "all" ? rows : rows.filter((row) => row.balance === filter);

  const sorted = [...filtered].sort((a, b) => {
    let cmp: number;
    if (sortKey === "createdAt") cmp = a.createdAt.getTime() - b.createdAt.getTime();
    else if (sortKey === "expected" || sortKey === "received") cmp = a[sortKey] - b[sortKey];
    else if (sortKey === "balance") cmp = a.balance.localeCompare(b.balance);
    else cmp = a[sortKey].localeCompare(b[sortKey], "nl", { sensitivity: "base" });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const columns: { key: SortKey; label: string }[] = [
    { key: "createdAt", label: "Datum" },
    { key: "participant", label: "Deelnemer" },
    { key: "eventName", label: "Event" },
    { key: "expected", label: "Verwacht" },
    { key: "received", label: "Ontvangen" },
    { key: "balance", label: "Saldo" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === option.key
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-slate-400 dark:hover:bg-zinc-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase dark:border-zinc-800 dark:text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-5 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white"
                  >
                    {column.label}
                    <SortIcon active={sortKey === column.key} dir={sortDir} />
                  </button>
                </th>
              ))}
              <th className="px-5 py-3 font-medium">Code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {sorted.map((row) => (
              <tr key={row.registrationId}>
                <td className="px-5 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                  {dateFormatter.format(row.createdAt)}
                </td>
                <td className="px-5 py-3 font-medium whitespace-nowrap text-zinc-900 dark:text-white">
                  {row.participant}
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <Link
                    href={`/admin/events/${row.eventId}/registrations`}
                    className="text-zinc-700 transition-colors hover:text-zinc-900 hover:underline dark:text-slate-300 dark:hover:text-white"
                  >
                    {row.eventName}
                  </Link>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {priceFormatter.format(row.expected)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {priceFormatter.format(row.received)}
                </td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${BALANCE_CLASS[row.balance]}`}>
                    {PAYMENT_BALANCE_LABEL[row.balance]}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {row.paymentReference}
                </td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                  Geen registraties in deze weergave.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
