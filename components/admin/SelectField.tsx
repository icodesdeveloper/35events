"use client";

import { Children, isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faCheck, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

type Option = { value: string; label: string; disabled?: boolean };

// Options are still authored as plain <option> children at every call site —
// this just reads them out instead of handing them to a real <select>, so no
// call site needs to change its JSX to adopt the custom panel below.
function extractOptions(children: ReactNode): Option[] {
  const options: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: unknown; children?: ReactNode; disabled?: boolean }>(child)) return;
    const value = child.props.value != null ? String(child.props.value) : "";
    const label = typeof child.props.children === "string" ? child.props.children : String(child.props.children ?? "");
    options.push({ value, label, disabled: child.props.disabled });
  });
  return options;
}

export default function SelectField({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  searchable = false,
  className,
  children,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const options = useMemo(() => extractOptions(children), [children]);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = isControlled ? value : internalValue;

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
    if (open && searchable) searchInputRef.current?.focus();
  }, [open, searchable]);

  function selectValue(next: string) {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
    setOpen(false);
    setQuery("");
  }

  const filteredOptions = query
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;
  const selectedLabel = options.find((option) => option.value === currentValue)?.label ?? "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-zinc-900 transition-colors focus:border-zinc-400 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white ${className ?? ""}`}
      >
        <span className={`truncate ${selectedLabel ? "" : "text-slate-400"}`}>{selectedLabel || "Kies..."}</span>
        <FontAwesomeIcon icon={faChevronDown} className="ml-2 h-3 w-3 shrink-0 text-slate-400" />
      </button>
      {name ? <input type="hidden" name={name} value={currentValue} required={required} readOnly /> : null}

      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {searchable ? (
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
          ) : null}
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">Geen resultaten</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => selectValue(option.value)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
                    option.value === currentValue
                      ? "bg-slate-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === currentValue ? (
                    <FontAwesomeIcon icon={faCheck} className="ml-2 h-3 w-3 shrink-0" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
