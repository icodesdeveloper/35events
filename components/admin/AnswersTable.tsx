"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSort, faSortUp, faSortDown } from "@fortawesome/free-solid-svg-icons";

export type AnswersTableColumn = { id: string; label: string };
export type AnswersTableRow = {
  registrationId: string;
  participant: string;
  vehicle: string;
  paid: boolean;
  answers: Record<string, string>;
};

type SortKey = "participant" | "vehicle" | (string & {});

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  const icon = !active ? faSort : dir === "asc" ? faSortUp : faSortDown;
  return <FontAwesomeIcon icon={icon} className="h-3 w-3" />;
}

export default function AnswersTable({ columns, rows }: { columns: AnswersTableColumn[]; rows: AnswersTableRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("participant");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function sortValue(row: AnswersTableRow, key: SortKey): string {
    if (key === "participant") return row.participant;
    if (key === "vehicle") return row.vehicle;
    return row.answers[key] ?? "";
  }

  const sorted = [...rows].sort((a, b) => {
    const cmp = sortValue(a, sortKey).localeCompare(sortValue(b, sortKey), "nl", { sensitivity: "base" });
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase dark:border-zinc-800 dark:text-slate-400">
          <tr>
            <th className="px-5 py-3 font-medium">
              <button
                type="button"
                onClick={() => toggleSort("participant")}
                className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white"
              >
                Deelnemer
                <SortIcon active={sortKey === "participant"} dir={sortDir} />
              </button>
            </th>
            <th className="px-5 py-3 font-medium">
              <button
                type="button"
                onClick={() => toggleSort("vehicle")}
                className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white"
              >
                Voertuig
                <SortIcon active={sortKey === "vehicle"} dir={sortDir} />
              </button>
            </th>
            <th className="px-5 py-3 font-medium">Betaald</th>
            {columns.map((column) => (
              <th key={column.id} className="px-5 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort(column.id)}
                  className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white"
                >
                  {column.label}
                  <SortIcon active={sortKey === column.id} dir={sortDir} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
          {sorted.map((row) => (
            <tr key={row.registrationId}>
              <td className="px-5 py-3 font-medium whitespace-nowrap text-zinc-900 dark:text-white">
                {row.participant}
              </td>
              <td className="px-5 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.vehicle}</td>
              <td className="px-5 py-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                    row.paid
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {row.paid ? "Betaald" : "Nog niet"}
                </span>
              </td>
              {columns.map((column) => (
                <td key={column.id} className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  {row.answers[column.id] || "—"}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={3 + columns.length} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                Nog geen registraties.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
