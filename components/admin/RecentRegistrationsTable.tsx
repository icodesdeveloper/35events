"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSort, faSortUp, faSortDown } from "@fortawesome/free-solid-svg-icons";
import type { PaymentStatus } from "@/lib/payments";

export type RecentRegistrationRow = {
  id: string;
  createdAt: Date;
  participant: string;
  vehicle: string;
  eventId: string;
  eventName: string;
  status: PaymentStatus;
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING_PAYMENT: "In afwachting",
  CONFIRMED: "Bevestigd",
  CANCELLED: "Geannuleerd",
};

const STATUS_CLASS: Record<PaymentStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400",
};

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

type SortKey = "createdAt" | "participant" | "vehicle" | "eventName" | "status";

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  const icon = !active ? faSort : dir === "asc" ? faSortUp : faSortDown;
  return <FontAwesomeIcon icon={icon} className="h-3 w-3" />;
}

export default function RecentRegistrationsTable({ rows }: { rows: RecentRegistrationRow[] }) {
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

  const sorted = [...rows].sort((a, b) => {
    let cmp: number;
    if (sortKey === "createdAt") {
      cmp = a.createdAt.getTime() - b.createdAt.getTime();
    } else {
      cmp = a[sortKey].localeCompare(b[sortKey], "nl", { sensitivity: "base" });
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const columns: { key: SortKey; label: string }[] = [
    { key: "createdAt", label: "Datum" },
    { key: "participant", label: "Deelnemer" },
    { key: "eventName", label: "Event" },
    { key: "vehicle", label: "Voertuig" },
    { key: "status", label: "Status" },
  ];

  return (
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
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
          {sorted.map((row) => (
            <tr key={row.id}>
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
              <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{row.vehicle}</td>
              <td className="px-5 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[row.status]}`}>
                  {STATUS_LABEL[row.status]}
                </span>
              </td>
            </tr>
          ))}
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                Nog geen registraties.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
