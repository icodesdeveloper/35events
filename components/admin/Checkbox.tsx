"use client";

import type { InputHTMLAttributes } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

export default function Checkbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700 select-none dark:text-slate-300 ${className ?? ""}`}
    >
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input type="checkbox" className="peer absolute inset-0 h-5 w-5 cursor-pointer opacity-0" {...props} />
        <span className="pointer-events-none absolute inset-0 rounded-md border border-slate-300 bg-white transition-colors peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 peer-focus-visible:ring-offset-1 dark:border-zinc-600 dark:bg-zinc-900 dark:peer-checked:border-white dark:peer-checked:bg-white" />
        <FontAwesomeIcon
          icon={faCheck}
          className="pointer-events-none relative h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100 dark:text-zinc-900"
        />
      </span>
      {label}
    </label>
  );
}
