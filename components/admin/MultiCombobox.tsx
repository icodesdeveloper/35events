"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faCheck, faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";

export type MultiComboboxOption = { value: string; label: string };

export default function MultiCombobox({
  name,
  values,
  onChange,
  options,
  placeholder = "Kies...",
  disabled,
}: {
  name?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: MultiComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("click", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    if (open) searchInputRef.current?.focus();
  }, [open]);

  function toggleValue(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  function removeValue(value: string, event: ReactMouseEvent) {
    event.stopPropagation();
    onChange(values.filter((v) => v !== value));
  }

  const selectedOptions = options.filter((option) => values.includes(option.value));
  const filteredOptions = query
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[2.5rem] w-full flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm transition-colors focus:border-zinc-400 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {selectedOptions.length === 0 ? (
          <span className="px-0.5 text-slate-400">{placeholder}</span>
        ) : (
          selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-slate-300"
            >
              {option.label}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => removeValue(option.value, e)}
                className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <FontAwesomeIcon icon={faXmark} className="h-2.5 w-2.5" />
              </span>
            </span>
          ))
        )}
        <FontAwesomeIcon icon={faChevronDown} className="ml-auto h-3 w-3 shrink-0 text-slate-400" />
      </button>
      {name
        ? values.map((v) => <input key={v} type="hidden" name={name} value={v} readOnly />)
        : null}

      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-slate-100 p-2 dark:border-zinc-800">
            <div className="relative">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="pointer-events-none absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zoeken..."
                className="w-full rounded-md border border-slate-200 bg-white py-1.5 pr-2 pl-8 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">Geen resultaten</div>
            ) : (
              filteredOptions.map((option) => {
                const checked = values.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleValue(option.value)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                      checked
                        ? "bg-slate-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {checked ? <FontAwesomeIcon icon={faCheck} className="ml-2 h-3 w-3 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
