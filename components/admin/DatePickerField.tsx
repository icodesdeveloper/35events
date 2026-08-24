"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { nlBE } from "react-day-picker/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar } from "@fortawesome/free-solid-svg-icons";

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

const displayFormatter = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", year: "numeric" });

export default function DatePickerField({
  name,
  defaultValue,
  required,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const selectedDate = parseISODate(value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
      >
        <span className={selectedDate ? undefined : "text-slate-400"}>
          {selectedDate ? displayFormatter.format(selectedDate) : "Kies een datum"}
        </span>
        <FontAwesomeIcon icon={faCalendar} className="h-3.5 w-3.5 text-slate-400" />
      </button>
      <input type="hidden" name={name} value={value} required={required} />

      {open ? (
        <div className="absolute z-20 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <DayPicker
            mode="single"
            locale={nlBE}
            selected={selectedDate}
            defaultMonth={selectedDate ?? new Date()}
            onSelect={(date) => {
              if (date) {
                setValue(toISODate(date));
                setOpen(false);
              }
            }}
            classNames={{
              months: "flex gap-4",
              month: "space-y-3",
              month_caption:
                "flex items-center justify-center h-8 text-sm font-medium text-zinc-900 dark:text-white",
              nav: "flex items-center justify-between",
              button_previous:
                "absolute left-3 top-3 h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800",
              button_next:
                "absolute right-3 top-3 h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800",
              weekdays: "flex",
              weekday: "w-8 text-center text-xs font-medium text-slate-400 dark:text-slate-500",
              week: "flex mt-1",
              day: "p-0",
              day_button:
                "h-8 w-8 rounded-md text-sm text-zinc-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-zinc-800",
              selected: "[&>button]:bg-zinc-900 [&>button]:text-white dark:[&>button]:bg-white dark:[&>button]:text-zinc-900",
              today: "[&>button]:font-semibold",
              outside: "[&>button]:text-slate-300 dark:[&>button]:text-zinc-700",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
