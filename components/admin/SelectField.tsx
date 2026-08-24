"use client";

import type { SelectHTMLAttributes } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

export default function SelectField({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-zinc-900 transition-colors focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white ${className ?? ""}`}
      >
        {children}
      </select>
      <FontAwesomeIcon
        icon={faChevronDown}
        className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}
