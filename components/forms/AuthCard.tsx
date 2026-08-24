import type { ReactNode } from "react";

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-white">{title}</h1>
        {subtitle ? <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}
