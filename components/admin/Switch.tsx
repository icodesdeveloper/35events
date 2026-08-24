"use client";

import type { InputHTMLAttributes } from "react";

export default function Switch({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-3 text-sm text-zinc-700 select-none dark:text-slate-300 ${className ?? ""}`}
    >
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input type="checkbox" className="peer sr-only" {...props} />
        <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 peer-focus-visible:ring-offset-1 dark:bg-zinc-700" />
        <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
      {label}
    </label>
  );
}
